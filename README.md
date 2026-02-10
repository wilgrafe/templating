# Account Form Builder (Flask)

A Flask app that creates one default form per account and renders it from a JSON layout. The layout is built using a WYSIWYG drag-and-drop editor and rendered dynamically with Jinja2 and Bootstrap.

## Features
- One default form per account created automatically on first login.
- Drag-and-drop builder for sections, rows, columns, and blocks.
- Layout stored as JSON per account.
- Dynamic rendering via Jinja2; no hardcoded form structure.
- Image uploads and image display blocks.
- Server-side validation using layout `required` flags.

## Stack
- Python, Flask
- Jinja2
- Bootstrap 5
- SQLite (default)

## Quick Start
1. Install deps:
   ```bash
   pip install -r requirements.txt
   ```
2. Run the server:
   ```bash
   python app.py
   ```
3. Open:
   - Login: `http://127.0.0.1:5000/login`
   - Form: `http://127.0.0.1:5000/<account>`
   - Builder: `http://127.0.0.1:5000/<account>/builder`

## Usage
- Log in with an account name (creates the account and default form).
- Use the builder to add/edit layout blocks.
- Save the layout.
- Open the form URL to see the rendered layout.

## Image Display
- Use `image_display` block to show images.
- Upload images directly in the builder (Image Display properties).
- Uploaded images are served from `/uploads/<account_id>/<filename>`.

## Endpoints
- `/<account>`: Rendered form.
- `/<account>/builder`: Builder UI (restricted to the logged-in account).
- `/<account>/api/layout` (GET/POST): Load/save layout.
- `/<account>/submit` (POST): Form submission.
- `/<account>/uploads` (POST): Upload image for image display.
- `/<account>/uploads/list` (GET): List uploaded images.

## Project Structure
- `app.py` ? Flask app, models, routes, validation
- `app/templates/` ? Jinja templates
- `app/static/` ? JS/CSS
- `app/uploads/` ? Uploaded images (gitignored)

## Notes
- Custom CSS is stored per account and injected into the form.
- Layout JSON is sanitized for allowed classes and inline styles.
- Allowed image extensions: `png`, `jpg`, `jpeg`, `gif`, `webp`, `bmp`.

## Optional Enhancements
- Version history
- Role-based access
- Analytics dashboard

