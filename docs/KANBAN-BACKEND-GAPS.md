# Kanban backend gaps (for full “B” editing)

The domain model includes fields that are not fully exposed by REST yet:

| Feature | Domain / DB | API today |
|--------|---------------|-----------|
| Card labels | `Card.labels` (text[]) | No create/update to set labels after insert |
| Edit card | title, description, assignee, due date, priority | Only **create** + **move** + **delete** |
| Edit column | name, position, **wipLimit** | Only **add** + **delete** column (WIP limit not settable) |
| Reorder columns | `position` | No dedicated endpoint |

**Recommended backend additions** (for parity with a rich Kanban UI):

1. `PATCH /api/v1/boards/cards/{cardId}` — body: partial card update (title, description, assigneeId, dueDate, priority, labels).
2. `PATCH /api/v1/boards/columns/{columnId}` — name, position, wipLimit.
3. Optional: `PATCH /api/v1/boards/{id}/columns/reorder` — ordered column IDs.

Until then, the frontend shows WIP limits when present, allows checklist + drag-and-drop + create flows, and documents read-only fields in the card drawer.
