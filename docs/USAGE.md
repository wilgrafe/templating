# Documentation

## Builder Workflow
1. Log in at `/login` with an account name.
2. Open `/<account>/builder`.
3. Add sections, rows, columns, and blocks.
4. Select a block to edit properties in the right panel.
5. Click **Save Layout**.

## Image Display
- Select `image_display` and set `Image URL`.
- Use **Upload image** or choose from **Pick uploaded image**.
- The form page will render the image as soon as the layout is saved.

## Layout JSON (Example)
```json
{
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
                  "required": true,
                  "placeholder": "Jane Doe"
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

## Security Rules
- Only whitelisted Bootstrap class prefixes are allowed.
- Inline styles are filtered to a safe list.
- Layout JSON is validated before saving.

