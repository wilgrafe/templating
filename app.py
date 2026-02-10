import json
import os
import re
from datetime import datetime
from flask import Flask, render_template, request, redirect, url_for, session, jsonify, abort, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from werkzeug.utils import secure_filename

app = Flask(__name__, template_folder="app/templates", static_folder="app/static")
app.config["SECRET_KEY"] = "dev-secret-change-me"
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///app.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["UPLOAD_FOLDER"] = os.path.join("app", "uploads")
app.config["MAX_CONTENT_LENGTH"] = 10 * 1024 * 1024
app.config["ASSET_VERSION"] = str(int(datetime.utcnow().timestamp()))

db = SQLAlchemy(app)


class Account(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), unique=True, nullable=False)


class FormLayout(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    account_id = db.Column(db.Integer, db.ForeignKey("account.id"), unique=True, nullable=False)
    layout_json = db.Column(db.Text, nullable=False)
    custom_css = db.Column(db.Text, nullable=True)

    account = db.relationship("Account", backref=db.backref("form_layout", uselist=False))


class FormResponse(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    account_id = db.Column(db.Integer, db.ForeignKey("account.id"), nullable=False)
    data_json = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    account = db.relationship("Account")


ALLOWED_FIELD_TYPES = {"input", "textarea", "select", "button", "text", "image", "date_range", "image_display"}
ALLOWED_INPUT_TYPES = {
    "text",
    "email",
    "number",
    "password",
    "date",
    "datetime-local",
    "tel",
    "url",
    "file",
}

ALLOWED_CLASS_PREFIXES = (
    "container",
    "container-",
    "row",
    "col-",
    "g-",
    "gx-",
    "gy-",
    "p-",
    "pt-",
    "pb-",
    "ps-",
    "pe-",
    "px-",
    "py-",
    "m-",
    "mt-",
    "mb-",
    "ms-",
    "me-",
    "mx-",
    "my-",
    "text-",
    "bg-",
    "border",
    "rounded",
    "d-",
    "flex",
    "justify-",
    "align-",
    "gap-",
)

ALLOWED_STYLE_PROPS = {
    "width",
    "min-width",
    "max-width",
    "margin",
    "margin-top",
    "margin-right",
    "margin-bottom",
    "margin-left",
    "padding",
    "padding-top",
    "padding-right",
    "padding-bottom",
    "padding-left",
    "text-align",
    "color",
    "background-color",
    "border",
    "border-radius",
}

ALLOWED_UPLOAD_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp", "bmp"}

def sanitize_custom_css(raw):
    if not raw:
        return ""
    if any(token in raw.lower() for token in ["<", ">", "url(", "expression", "@import"]):
        return ""
    if re.search(r"[{}]", raw) is None:
        return raw.strip()
    return raw.strip()

def sanitize_image_src(raw):
    if not raw:
        return ""
    src = str(raw).strip()
    if src.lower().startswith("javascript:"):
        return ""
    if re.match(r"^https?://", src):
        return src
    if src.startswith("/uploads/") or src.startswith("/static/"):
        return src
    if src.startswith("uploads/") or src.startswith("static/"):
        return "/" + src
    return ""

@app.before_request
def ensure_db():
    db.create_all()
    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)


def create_default_layout():
    return {
        "sections": [
            {
                "id": "section-1",
                "class": "container py-4",
                "style": "",
                "rows": [
                    {
                        "id": "row-1",
                        "class": "row g-3",
                        "style": "",
                        "columns": [
                            {
                                "id": "col-1",
                                "class": "col-md-6",
                                "style": "",
                                "blocks": [
                                    {
                                        "type": "field",
                                        "field_type": "input",
                                        "name": "full_name",
                                        "label": "Full name",
                                        "input_type": "text",
                                        "required": True,
                                        "placeholder": "Jane Doe",
                                    }
                                ],
                            },
                            {
                                "id": "col-2",
                                "class": "col-md-6",
                                "style": "",
                                "blocks": [
                                    {
                                        "type": "field",
                                        "field_type": "input",
                                        "name": "email",
                                        "label": "Email",
                                        "input_type": "email",
                                        "required": True,
                                        "placeholder": "name@example.com",
                                    }
                                ],
                            },
                            {
                                "id": "col-3",
                                "class": "col-12",
                                "style": "",
                                "blocks": [
                                    {
                                        "type": "field",
                                        "field_type": "textarea",
                                        "name": "message",
                                        "label": "Message",
                                        "required": False,
                                        "placeholder": "How can we help?",
                                    },
                                    {
                                        "type": "field",
                                        "field_type": "button",
                                        "name": "submit",
                                        "label": "",
                                        "text": "Submit",
                                        "input_type": "submit",
                                        "required": False,
                                    },
                                ],
                            },
                        ],
                    }
                ],
            }
        ]
    }


def get_current_account(account_name=None):
    if account_name:
        return Account.query.filter_by(name=account_name).first()
    account_id = session.get("account_id")
    if not account_id:
        return None
    return db.session.get(Account, account_id)


def ensure_default_form(account):
    if account.form_layout:
        return
    layout = create_default_layout()
    layout_json = json.dumps(layout)
    form_layout = FormLayout(account_id=account.id, layout_json=layout_json, custom_css="")
    db.session.add(form_layout)
    db.session.commit()


def sanitize_class_list(raw):
    if not raw:
        return ""
    classes = []
    for cls in raw.split():
        if not re.match(r"^[a-zA-Z0-9-]+$", cls):
            continue
        if any(cls == prefix or cls.startswith(prefix) for prefix in ALLOWED_CLASS_PREFIXES):
            classes.append(cls)
    return " ".join(classes)


def sanitize_style(raw):
    if not raw:
        return ""
    safe_parts = []
    parts = [p.strip() for p in raw.split(";") if p.strip()]
    for part in parts:
        if ":" not in part:
            continue
        prop, value = [p.strip() for p in part.split(":", 1)]
        prop_lc = prop.lower()
        if prop_lc not in ALLOWED_STYLE_PROPS:
            continue
        value_lc = value.lower()
        if "url(" in value_lc or "expression" in value_lc:
            continue
        if re.search(r"[;{}]", value_lc):
            continue
        safe_parts.append(f"{prop_lc}: {value}")
    return "; ".join(safe_parts)


def validate_block(block):
    if block.get("type") != "field":
        return False
    field_type = block.get("field_type")
    if field_type not in ALLOWED_FIELD_TYPES:
        return False
    name = block.get("name")
    if field_type not in {"text", "button", "image_display"} and not name:
        return False
    if field_type == "input":
        input_type = block.get("input_type", "text")
        if input_type not in ALLOWED_INPUT_TYPES:
            return False
    return True


def sanitize_layout(layout):
    if not isinstance(layout, dict):
        raise ValueError("Layout must be an object")
    sections = layout.get("sections", [])
    if not isinstance(sections, list):
        raise ValueError("Sections must be a list")

    def sanitize_block(block):
        if not validate_block(block):
            raise ValueError("Invalid block")
        field_type = block.get("field_type")
        sanitized = {
            "type": "field",
            "field_type": field_type,
            "name": block.get("name", "") if field_type not in {"text", "button"} else block.get("name", ""),
            "label": block.get("label", ""),
            "required": bool(block.get("required", False)),
            "placeholder": block.get("placeholder", ""),
            "class": sanitize_class_list(block.get("class", "")),
            "style": sanitize_style(block.get("style", "")),
        }
        if field_type == "input":
            sanitized["input_type"] = block.get("input_type", "text")
        if field_type == "textarea":
            sanitized["input_type"] = "textarea"
        if field_type == "select":
            sanitized["input_type"] = "select"
            options = block.get("options", [])
            if not isinstance(options, list):
                options = []
            sanitized["options"] = [str(o) for o in options]
        if field_type == "button":
            sanitized["input_type"] = block.get("input_type", "submit")
            sanitized["text"] = block.get("text", "Submit")
        if field_type == "image":
            sanitized["input_type"] = "file"
        if field_type == "date_range":
            sanitized["input_type"] = "date_range"
        if field_type == "image_display":
            sanitized["input_type"] = "image_display"
            sanitized["src"] = sanitize_image_src(block.get("src", ""))
            sanitized["alt"] = block.get("alt", "")
        if field_type == "text":
            sanitized["text"] = block.get("text", "")
        return sanitized

    def sanitize_column(col):
        blocks = col.get("blocks", [])
        if not isinstance(blocks, list):
            raise ValueError("Blocks must be a list")
        return {
            "id": str(col.get("id", "")),
            "class": sanitize_class_list(col.get("class", "")),
            "style": sanitize_style(col.get("style", "")),
            "blocks": [sanitize_block(b) for b in blocks],
        }

    def sanitize_row(row):
        cols = row.get("columns", [])
        if not isinstance(cols, list):
            raise ValueError("Columns must be a list")
        return {
            "id": str(row.get("id", "")),
            "class": sanitize_class_list(row.get("class", "")),
            "style": sanitize_style(row.get("style", "")),
            "columns": [sanitize_column(c) for c in cols],
        }

    def sanitize_section(section):
        rows = section.get("rows", [])
        if not isinstance(rows, list):
            raise ValueError("Rows must be a list")
        return {
            "id": str(section.get("id", "")),
            "class": sanitize_class_list(section.get("class", "")) or "container",
            "style": sanitize_style(section.get("style", "")),
            "rows": [sanitize_row(r) for r in rows],
        }

    sanitized_sections = [sanitize_section(s) for s in sections]
    return {"sections": sanitized_sections}


def extract_fields(layout):
    fields = []
    for section in layout.get("sections", []):
        for row in section.get("rows", []):
            for col in row.get("columns", []):
                for block in col.get("blocks", []):
                    if block.get("type") != "field":
                        continue
                    field_type = block.get("field_type")
                    if field_type in {"text", "button", "image_display"}:
                        continue
                    fields.append(block)
    return fields


def is_allowed_file(filename):
    if "." not in filename:
        return False
    ext = filename.rsplit(".", 1)[1].lower()
    return ext in ALLOWED_UPLOAD_EXTENSIONS


def save_upload(file_storage, account_id):
    if not file_storage or not file_storage.filename:
        return ""
    filename = secure_filename(file_storage.filename)
    if not filename or not is_allowed_file(filename):
        return None
    account_dir = os.path.join(app.config["UPLOAD_FOLDER"], str(account_id))
    os.makedirs(account_dir, exist_ok=True)
    saved_path = os.path.join(account_dir, filename)
    file_storage.save(saved_path)
    return os.path.relpath(saved_path, "app")


@app.route("/")
def index():
    account = get_current_account()
    if not account:
        return redirect(url_for("login"))
    return redirect(url_for("account_form", account_name=account.name))


@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        name = request.form.get("name", "").strip()
        if not name:
            return render_template("login.html", error="Account name is required")
        account = Account.query.filter_by(name=name).first()
        if not account:
            account = Account(name=name)
            db.session.add(account)
            db.session.commit()
            ensure_default_form(account)
        session["account_id"] = account.id
        session["account_name"] = account.name
        return redirect(url_for("account_form", account_name=account.name))
    return render_template("login.html")


@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))


@app.route("/uploads/<path:filename>")
def uploads(filename):
    return send_from_directory(app.config["UPLOAD_FOLDER"], filename)


@app.route("/<account_name>/uploads", methods=["POST"])
def upload_image(account_name):
    if session.get("account_name") != account_name:
        abort(403)
    account = get_current_account(account_name=account_name)
    if not account:
        abort(401)
    file = request.files.get("file")
    if not file or not file.filename:
        return jsonify({"error": "No file provided"}), 400
    saved = save_upload(file, account.id)
    if saved is None:
        return jsonify({"error": "Invalid file type"}), 400
    return jsonify({"url": "/" + saved})


@app.route("/<account_name>/uploads/list")
def list_uploads(account_name):
    if session.get("account_name") != account_name:
        abort(403)
    account = get_current_account(account_name=account_name)
    if not account:
        abort(401)
    account_dir = os.path.join(app.config["UPLOAD_FOLDER"], str(account.id))
    if not os.path.isdir(account_dir):
        return jsonify({"account_id": account.id, "files": []})
    files = []
    for filename in os.listdir(account_dir):
        if not is_allowed_file(filename):
            continue
        files.append({
            "name": filename,
            "url": f"/uploads/{account.id}/{filename}",
        })
    return jsonify({"account_id": account.id, "files": files})


@app.route("/<account_name>/builder")
def builder(account_name):
    if session.get("account_name") != account_name:
        return redirect(url_for("login"))
    account = get_current_account(account_name=account_name)
    if not account:
        return redirect(url_for("login"))
    ensure_default_form(account)
    layout = json.loads(account.form_layout.layout_json)
    return render_template(
        "builder.html",
        layout_json=json.dumps(layout),
        custom_css=account.form_layout.custom_css or "",
    )


@app.route("/<account_name>")
def account_form(account_name):
    account = get_current_account(account_name=account_name)
    if not account:
        return redirect(url_for("login"))
    ensure_default_form(account)
    layout = json.loads(account.form_layout.layout_json)
    return render_template(
        "form.html",
        layout=layout,
        custom_css=account.form_layout.custom_css or "",
        account_name=account.name,
    )


@app.route("/<account_name>/api/layout", methods=["GET"])
def api_get_layout(account_name):
    if session.get("account_name") != account_name:
        abort(403)
    account = get_current_account(account_name=account_name)
    if not account:
        abort(401)
    ensure_default_form(account)
    return jsonify(json.loads(account.form_layout.layout_json))


@app.route("/<account_name>/api/layout", methods=["POST"])
def api_save_layout(account_name):
    if session.get("account_name") != account_name:
        abort(403)
    account = get_current_account(account_name=account_name)
    if not account:
        abort(401)
    ensure_default_form(account)
    payload = request.get_json(silent=True) or {}
    layout = payload.get("layout")
    custom_css = sanitize_custom_css(payload.get("custom_css", ""))
    try:
        sanitized_layout = sanitize_layout(layout)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    account.form_layout.layout_json = json.dumps(sanitized_layout)
    account.form_layout.custom_css = custom_css
    db.session.commit()
    return jsonify({"status": "ok"})


@app.route("/<account_name>/submit", methods=["POST"])
def submit(account_name):
    account = get_current_account(account_name=account_name)
    if not account:
        abort(401)
    ensure_default_form(account)
    layout = json.loads(account.form_layout.layout_json)
    fields = extract_fields(layout)
    errors = {}
    data = {}
    for field in fields:
        name = field.get("name")
        field_type = field.get("field_type")
        if field_type == "image":
            file = request.files.get(name)
            filename = file.filename if file else ""
            if filename:
                saved = save_upload(file, account.id)
                if saved is None:
                    errors[name] = "Invalid file type"
                else:
                    data[name] = saved
            elif field.get("required"):
                errors[name] = "Required"
            continue
        if field_type == "date_range":
            start = request.form.get(f"{name}_start", "").strip()
            end = request.form.get(f"{name}_end", "").strip()
            if field.get("required") and (not start or not end):
                errors[name] = "Required"
            data[name] = {"start": start, "end": end}
            continue
        value = request.form.get(name, "").strip()
        if field.get("required") and not value:
            errors[name] = "Required"
        data[name] = value
    if errors:
        return render_template(
            "form.html",
            layout=layout,
            custom_css=account.form_layout.custom_css or "",
            errors=errors,
            data=data,
            account_name=account.name,
        ), 400
    response = FormResponse(account_id=account.id, data_json=json.dumps(data))
    db.session.add(response)
    db.session.commit()
    return render_template(
        "form.html",
        layout=layout,
        custom_css=account.form_layout.custom_css or "",
        success=True,
        account_name=account.name,
    )


if __name__ == "__main__":
    app.run(debug=True)
