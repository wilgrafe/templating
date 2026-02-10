const canvas = document.getElementById("layout-canvas");
const propertiesPanel = document.getElementById("properties-panel");
const deleteBtn = document.getElementById("delete-element");
const saveBtn = document.getElementById("save-layout");
const customCssInput = document.getElementById("custom-css");

let selected = null;
let cachedUploads = null;

function createEl(tag, className) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  return el;
}

function setSelected(el) {
  if (selected) selected.classList.remove("is-selected");
  selected = el;
  if (selected) selected.classList.add("is-selected");
  deleteBtn.disabled = !selected;
  renderProperties();
}

function makeDraggable(container, group) {
  new Sortable(container, {
    group,
    animation: 150,
    ghostClass: "drag-ghost",
    onEnd() {
      renderProperties();
    },
  });
}

function createSection(data = {}) {
  const section = createEl("div", "builder-section");
  section.dataset.type = "section";
  section.dataset.id = data.id || "";
  section.dataset.class = data.class || "container";
  section.dataset.style = data.style || "";

  const header = createEl("div", "builder-label");
  header.textContent = "Section";
  section.appendChild(header);

  const rows = createEl("div", "builder-rows");
  section.appendChild(rows);
  makeDraggable(rows, "rows");

  section.addEventListener("click", (e) => {
    e.stopPropagation();
    setSelected(section);
  });

  return section;
}

function createRow(data = {}) {
  const row = createEl("div", "builder-row");
  row.dataset.type = "row";
  row.dataset.id = data.id || "";
  row.dataset.class = data.class || "row g-3";
  row.dataset.style = data.style || "";

  const header = createEl("div", "builder-label");
  header.textContent = "Row";
  row.appendChild(header);

  const cols = createEl("div", "builder-columns");
  row.appendChild(cols);
  makeDraggable(cols, "columns");

  row.addEventListener("click", (e) => {
    e.stopPropagation();
    setSelected(row);
  });

  return row;
}

function createColumn(data = {}) {
  const col = createEl("div", "builder-column");
  col.dataset.type = "column";
  col.dataset.id = data.id || "";
  col.dataset.class = data.class || "col-md-6";
  col.dataset.style = data.style || "";

  const header = createEl("div", "builder-label");
  header.textContent = "Column";
  col.appendChild(header);

  const blocks = createEl("div", "builder-blocks");
  col.appendChild(blocks);
  makeDraggable(blocks, "blocks");

  col.addEventListener("click", (e) => {
    e.stopPropagation();
    setSelected(col);
  });

  return col;
}

function createBlock(data = {}) {
  const block = createEl("div", "builder-block");
  block.dataset.type = "block";
  block.dataset.fieldType = data.field_type || "input";
  block.dataset.name = data.name || "";
  block.dataset.label = data.label || "";
  block.dataset.required = data.required ? "true" : "false";
  block.dataset.placeholder = data.placeholder || "";
  block.dataset.inputType = data.input_type || "text";
  block.dataset.text = data.text || "";
  block.dataset.options = (data.options || []).join(",");
  block.dataset.class = data.class || "";
  block.dataset.style = data.style || "";
  block.dataset.src = data.src || "";
  block.dataset.alt = data.alt || "";

  const body = createEl("div", "builder-block-body");
  block.appendChild(body);
  updateBlockPreview(block);

  block.addEventListener("click", (e) => {
    e.stopPropagation();
    setSelected(block);
  });

  return block;
}

function updateBlockPreview(block) {
  const body = block.querySelector(".builder-block-body");
  const type = block.dataset.fieldType;
  const label = block.dataset.label || "(no label)";
  if (type === "button") {
    body.textContent = `Button: ${block.dataset.text || "Submit"}`;
  } else if (type === "text") {
    body.textContent = `Text: ${block.dataset.text || ""}`;
  } else if (type === "image") {
    body.textContent = `Image: ${label}`;
  } else if (type === "date_range") {
    body.textContent = `Date range: ${label}`;
  } else if (type === "image_display") {
    body.textContent = `Image display: ${block.dataset.src || "(no src)"}`;
  } else if (type === "select") {
    body.textContent = `Select: ${label}`;
  } else if (type === "textarea") {
    body.textContent = `Textarea: ${label}`;
  } else {
    body.textContent = `Input: ${label} (${block.dataset.inputType})`;
  }
}

function renderProperties() {
  propertiesPanel.innerHTML = "";
  if (!selected) {
    propertiesPanel.innerHTML = "<p class=\"text-muted small\">Select an element to edit its properties.</p>";
    return;
  }

  const type = selected.dataset.type;
  if (type === "section" || type === "row" || type === "column") {
    const classInput = createInput("Bootstrap classes", selected.dataset.class || "");
    classInput.input.addEventListener("input", () => {
      selected.dataset.class = classInput.input.value;
    });

    const styleInput = createInput("Inline style", selected.dataset.style || "");
    styleInput.input.addEventListener("input", () => {
      selected.dataset.style = styleInput.input.value;
    });

    propertiesPanel.appendChild(classInput.group);
    propertiesPanel.appendChild(styleInput.group);
  }

  if (type === "block") {
    const classInput = createInput("Bootstrap classes", selected.dataset.class || "");
    classInput.input.addEventListener("input", () => {
      selected.dataset.class = classInput.input.value;
    });
    propertiesPanel.appendChild(classInput.group);

    const styleInput = createInput("Inline style", selected.dataset.style || "");
    styleInput.input.addEventListener("input", () => {
      selected.dataset.style = styleInput.input.value;
    });
    propertiesPanel.appendChild(styleInput.group);

    const fieldType = createSelect("Field type", [
      "input",
      "textarea",
      "select",
      "image",
      "date_range",
      "image_display",
      "button",
      "text",
    ], selected.dataset.fieldType);
    fieldType.select.addEventListener("change", () => {
      selected.dataset.fieldType = fieldType.select.value;
      updateBlockPreview(selected);
      renderProperties();
    });
    propertiesPanel.appendChild(fieldType.group);

    if (!["text", "button", "image_display"].includes(selected.dataset.fieldType)) {
      const nameInput = createInput("Field name", selected.dataset.name || "");
      nameInput.input.addEventListener("input", () => {
        selected.dataset.name = nameInput.input.value;
      });
      propertiesPanel.appendChild(nameInput.group);
    }

    if (selected.dataset.fieldType !== "text") {
      const labelInput = createInput("Label", selected.dataset.label || "");
      labelInput.input.addEventListener("input", () => {
        selected.dataset.label = labelInput.input.value;
        updateBlockPreview(selected);
      });
      propertiesPanel.appendChild(labelInput.group);
    }

    if (selected.dataset.fieldType === "input") {
      const inputType = createSelect("Input type", [
        "text",
        "email",
        "number",
        "password",
        "date",
        "datetime-local",
        "tel",
        "url",
        "file",
      ], selected.dataset.inputType || "text");
      inputType.select.addEventListener("change", () => {
        selected.dataset.inputType = inputType.select.value;
        updateBlockPreview(selected);
      });
      propertiesPanel.appendChild(inputType.group);
    }

    if (selected.dataset.fieldType === "select") {
      const optionsInput = createInput("Options (comma separated)", selected.dataset.options || "");
      optionsInput.input.addEventListener("input", () => {
        selected.dataset.options = optionsInput.input.value;
      });
      propertiesPanel.appendChild(optionsInput.group);
    }

    if (selected.dataset.fieldType === "textarea" || selected.dataset.fieldType === "input") {
      const placeholderInput = createInput("Placeholder", selected.dataset.placeholder || "");
      placeholderInput.input.addEventListener("input", () => {
        selected.dataset.placeholder = placeholderInput.input.value;
      });
      propertiesPanel.appendChild(placeholderInput.group);
    }

    if (selected.dataset.fieldType === "button" || selected.dataset.fieldType === "text") {
      const textInput = createInput("Text", selected.dataset.text || "");
      textInput.input.addEventListener("input", () => {
        selected.dataset.text = textInput.input.value;
        updateBlockPreview(selected);
      });
      propertiesPanel.appendChild(textInput.group);
    }

    if (!["text", "button", "image_display"].includes(selected.dataset.fieldType)) {
      const requiredInput = createCheckbox("Required", selected.dataset.required === "true");
      requiredInput.input.addEventListener("change", () => {
        selected.dataset.required = requiredInput.input.checked ? "true" : "false";
      });
      propertiesPanel.appendChild(requiredInput.group);
    }

    if (selected.dataset.fieldType === "image_display") {
      const srcInput = createInput("Image URL", selected.dataset.src || "");
      srcInput.input.addEventListener("input", () => {
        selected.dataset.src = srcInput.input.value;
        updateBlockPreview(selected);
      });
      propertiesPanel.appendChild(srcInput.group);

      const uploadInput = createFileInput("Upload image");
      propertiesPanel.appendChild(uploadInput.group);
      uploadInput.input.addEventListener("change", async () => {
        if (!uploadInput.input.files || uploadInput.input.files.length === 0) return;
        const formData = new FormData();
        formData.append("file", uploadInput.input.files[0]);
        const res = await fetch(`/${window.ACCOUNT_NAME}/uploads`, {
          method: "POST",
          body: formData,
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          alert(data.error || "Upload failed");
          return;
        }
        const data = await res.json();
        if (data.url) {
          selected.dataset.src = data.url;
          srcInput.input.value = data.url;
          updateBlockPreview(selected);
          cachedUploads = null;
        }
      });

      const picker = createSelectWithPlaceholder("Pick uploaded image", "Select an upload");
      propertiesPanel.appendChild(picker.group);
      loadUploads().then((files) => {
        files.forEach((file) => {
          const opt = createEl("option");
          opt.value = file.url;
          opt.textContent = file.name;
          picker.select.appendChild(opt);
        });
      });
      picker.select.addEventListener("change", () => {
        if (!picker.select.value) return;
        selected.dataset.src = picker.select.value;
        srcInput.input.value = picker.select.value;
        updateBlockPreview(selected);
      });

      const altInput = createInput("Alt text", selected.dataset.alt || "");
      altInput.input.addEventListener("input", () => {
        selected.dataset.alt = altInput.input.value;
      });
      propertiesPanel.appendChild(altInput.group);
    }
  }
}

function createInput(label, value) {
  const group = createEl("div", "mb-3");
  const lbl = createEl("label", "form-label");
  lbl.textContent = label;
  const input = createEl("input", "form-control form-control-sm");
  input.value = value;
  group.appendChild(lbl);
  group.appendChild(input);
  return { group, input };
}

function createFileInput(label) {
  const group = createEl("div", "mb-3");
  const lbl = createEl("label", "form-label");
  lbl.textContent = label;
  const input = createEl("input", "form-control form-control-sm");
  input.type = "file";
  input.accept = "image/*";
  group.appendChild(lbl);
  group.appendChild(input);
  return { group, input };
}

function createSelect(label, options, selectedValue) {
  const group = createEl("div", "mb-3");
  const lbl = createEl("label", "form-label");
  lbl.textContent = label;
  const select = createEl("select", "form-select form-select-sm");
  options.forEach((opt) => {
    const option = createEl("option");
    option.value = opt;
    option.textContent = opt;
    if (opt === selectedValue) option.selected = true;
    select.appendChild(option);
  });
  group.appendChild(lbl);
  group.appendChild(select);
  return { group, select };
}

function createSelectWithPlaceholder(label, placeholder) {
  const group = createEl("div", "mb-3");
  const lbl = createEl("label", "form-label");
  lbl.textContent = label;
  const select = createEl("select", "form-select form-select-sm");
  const option = createEl("option");
  option.value = "";
  option.textContent = placeholder;
  select.appendChild(option);
  group.appendChild(lbl);
  group.appendChild(select);
  return { group, select };
}

function createCheckbox(label, checked) {
  const group = createEl("div", "form-check form-switch mb-3");
  const input = createEl("input", "form-check-input");
  input.type = "checkbox";
  input.checked = checked;
  const lbl = createEl("label", "form-check-label");
  lbl.textContent = label;
  group.appendChild(input);
  group.appendChild(lbl);
  return { group, input };
}

function addSection() {
  const section = createSection();
  canvas.appendChild(section);
}

function addRow() {
  const targetSection = selected && selected.dataset.type === "section"
    ? selected
    : selected && selected.closest(".builder-section");
  const section = targetSection || canvas.querySelector(".builder-section");
  if (!section) {
    addSection();
  }
  const realSection = targetSection || canvas.querySelector(".builder-section");
  if (realSection) {
    const rows = realSection.querySelector(".builder-rows");
    rows.appendChild(createRow());
  }
}

function addColumn() {
  const targetRow = selected && selected.dataset.type === "row"
    ? selected
    : selected && selected.closest(".builder-row");
  const row = targetRow || canvas.querySelector(".builder-row");
  if (!row) {
    addRow();
  }
  const realRow = targetRow || canvas.querySelector(".builder-row");
  if (realRow) {
    const cols = realRow.querySelector(".builder-columns");
    cols.appendChild(createColumn());
  }
}

function addBlock(fieldType) {
  const targetCol = selected && selected.dataset.type === "column"
    ? selected
    : selected && selected.closest(".builder-column");
  const col = targetCol || canvas.querySelector(".builder-column");
  if (!col) {
    addColumn();
  }
  const realCol = targetCol || canvas.querySelector(".builder-column");
  if (realCol) {
    const blocks = realCol.querySelector(".builder-blocks");
    const block = createBlock({ field_type: fieldType });
    blocks.appendChild(block);
  }
}

async function loadUploads() {
  if (cachedUploads) return cachedUploads;
  try {
    const res = await fetch(`/${window.ACCOUNT_NAME}/uploads/list`);
    if (!res.ok) return [];
    const data = await res.json();
    cachedUploads = data.files || [];
    return cachedUploads;
  } catch (err) {
    return [];
  }
}

function serializeLayout() {
  const sections = Array.from(canvas.querySelectorAll(":scope > .builder-section")).map((section, sIdx) => {
    const rows = Array.from(section.querySelectorAll(":scope > .builder-rows > .builder-row")).map((row, rIdx) => {
      const columns = Array.from(row.querySelectorAll(":scope > .builder-columns > .builder-column")).map((col, cIdx) => {
        const blocks = Array.from(col.querySelectorAll(":scope > .builder-blocks > .builder-block")).map((block, bIdx) => {
          const fieldType = block.dataset.fieldType;
      const base = {
        type: "field",
        field_type: fieldType,
        name: block.dataset.name || `field_${sIdx}_${rIdx}_${cIdx}_${bIdx}`,
        label: block.dataset.label || "",
        required: block.dataset.required === "true",
        placeholder: block.dataset.placeholder || "",
        class: block.dataset.class || "",
        style: block.dataset.style || "",
      };
          if (fieldType === "input") {
            base.input_type = block.dataset.inputType || "text";
          }
          if (fieldType === "textarea") {
            base.input_type = "textarea";
          }
          if (fieldType === "select") {
            base.input_type = "select";
            base.options = (block.dataset.options || "").split(",").map((o) => o.trim()).filter(Boolean);
          }
          if (fieldType === "button") {
            base.input_type = block.dataset.inputType || "submit";
            base.text = block.dataset.text || "Submit";
          }
          if (fieldType === "image") {
            base.input_type = "file";
          }
          if (fieldType === "date_range") {
            base.input_type = "date_range";
          }
          if (fieldType === "image_display") {
            base.input_type = "image_display";
            base.src = block.dataset.src || "";
            base.alt = block.dataset.alt || "";
          }
          if (fieldType === "text") {
            base.text = block.dataset.text || "";
          }
          return base;
        });
        return {
          id: col.dataset.id || `col-${sIdx}-${rIdx}-${cIdx}`,
          class: col.dataset.class || "",
          style: col.dataset.style || "",
          columns: undefined,
          blocks,
        };
      });
      return {
        id: row.dataset.id || `row-${sIdx}-${rIdx}`,
        class: row.dataset.class || "",
        style: row.dataset.style || "",
        columns,
      };
    });
    return {
      id: section.dataset.id || `section-${sIdx}`,
      class: section.dataset.class || "container",
      style: section.dataset.style || "",
      rows,
    };
  });

  return { sections };
}

function loadLayout(layout) {
  canvas.innerHTML = "";
  (layout.sections || []).forEach((sectionData) => {
    const section = createSection(sectionData);
    const rowsContainer = section.querySelector(".builder-rows");
    (sectionData.rows || []).forEach((rowData) => {
      const row = createRow(rowData);
      const colsContainer = row.querySelector(".builder-columns");
      (rowData.columns || []).forEach((colData) => {
        const col = createColumn(colData);
        const blocksContainer = col.querySelector(".builder-blocks");
        (colData.blocks || []).forEach((blockData) => {
          blocksContainer.appendChild(createBlock(blockData));
        });
        colsContainer.appendChild(col);
      });
      rowsContainer.appendChild(row);
    });
    canvas.appendChild(section);
  });
}

function bindActions() {
  document.querySelectorAll("[data-add]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const type = btn.dataset.add;
      if (type === "section") addSection();
      if (type === "row") addRow();
      if (type === "column") addColumn();
      if (["input", "textarea", "select", "image", "date_range", "image_display", "button", "text"].includes(type)) {
        addBlock(type);
      }
    });
  });

  canvas.addEventListener("click", () => setSelected(null));

  deleteBtn.addEventListener("click", () => {
    if (!selected) return;
    const toRemove = selected;
    setSelected(null);
    toRemove.remove();
  });

  saveBtn.addEventListener("click", async () => {
    const payload = {
      layout: serializeLayout(),
      custom_css: customCssInput.value || "",
    };
    const res = await fetch(`/${window.ACCOUNT_NAME}/api/layout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || "Failed to save layout");
      return;
    }
    alert("Layout saved");
  });
}

loadLayout(window.INIT_LAYOUT || { sections: [] });
makeDraggable(canvas, "sections");
bindActions();
renderProperties();
