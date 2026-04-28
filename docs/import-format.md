# Test import formats

Two file types are accepted on the **/teacher/tests** page via "Choose file":

## JSON (recommended, full coverage)

One JSON object per test. Supports all 6 question types. Mirrors the data
model directly, so what you upload is exactly what the editor produces.

```json
{
  "title": "Sample Quiz",
  "description": "Optional description",
  "duration_minutes": 30,
  "sections": [
    {
      "title": "Multiple Choice",
      "draw_count": null,
      "instructions": "Optional",
      "questions": [
        {
          "type": "multiple_choice",
          "prompt": "What is 2 + 2?",
          "points": 1,
          "options": [
            { "id": "a", "text": "3" },
            { "id": "b", "text": "4" }
          ],
          "correct": ["b"],
          "multi_select": false
        }
      ]
    }
  ]
}
```

### Per-type fields

- `multiple_choice`: `options[{id,text}]`, `correct: string[]` (option ids), `multi_select: bool`
- `true_false`: `correct: bool`
- `short_answer`: `accepts: [{value, mode}]` where mode is `"exact" | "ci" | "ws" | "contains"`; optional `tolerance: number` for numeric answers
- `long_answer`: `rubric: string` (optional, shown only to teacher when grading)
- `matching`: `left[{id,text}]`, `right[{id,text}]`, `pairs: [[leftId, rightId], ...]`
- `ordering`: `items[{id,text}]`, `correct_order: [id, ...]`

Optional on every question: `image_url`, `youtube_id`, `points`.

`draw_count` on a section: how many questions to randomly pull per student.
`null` (or omitted) = use all questions in the section.

## CSV (simpler, MC / TF / short / long only)

One row per question. Headers must match exactly. Matching and ordering are
not supported in CSV - use JSON for those.

```csv
section,type,prompt,points,option_a,option_b,option_c,option_d,correct,image_url,youtube_id
"Section 1",multiple_choice,"What is 2+2?",1,"3","4","5","6","b",,
"Section 1",true_false,"The Earth is round.",1,,,,,"true",,
"Section 1",short_answer,"What is H2O?",1,"water",,,,,,
"Section 1",long_answer,"Describe the water cycle.",5,,,,,,,
```

- `section` groups questions; rows with the same value go in the same section.
- `type` is one of `multiple_choice | true_false | short_answer | long_answer`.
- For multiple choice: fill `option_a` through `option_d` (extras ignored), and put the **letter** of the correct option in `correct`.
- For true/false: `correct` is `true` or `false`.
- For short answer: put the accepted answer in `option_a` (case-insensitive match).
- For long answer: leave option columns and `correct` blank; you grade these manually.

You can download both templates from the **Tests** page.
