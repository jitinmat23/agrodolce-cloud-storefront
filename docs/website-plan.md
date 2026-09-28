# Agrodolce website plan

## Scope

Build one scrolling storefront for a home bakery serving Devanahalli, Bengaluru. Use cream backgrounds, olive accents, elegant headings, placeholder photos, and clearly identified sample products during development. Replace sample content before launch.

Customers order as guests. No payments, accounts, or admin interface in the first version. The owner maintains content in configuration files. Keep the exact pickup address and baker's WhatsApp number private.

## Module boundaries

Keep one application and one deployment initially. Modules are folders with clear responsibilities, not separate services. Choose the framework and hosting during implementation.

| Module | Responsibility |
| --- | --- |
| Site content | Brand text, public service area, product catalogue, special-request options, photos, and prices. No private contact details or credentials. |
| Storefront | Single-page layout, introduction, menu, and navigation to order and enquiry sections. |
| Catalogue | Product cards with descriptions, egg/eggless information, unit labels, and INR prices. |
| Basket | Multiple predefined products, quantities, removal, and estimated total. No special enquiries or egg/eggless customisation. |
| Pickup and contact | Shared name, required WhatsApp number, optional email, and preferred pickup date/time fields. No available-slot scheduling or fixed lead-time rules yet. |
| Standard orders | Submit basket contents and contact/pickup details as a pending request. |
| Special enquiries | Independent form with configurable dropdowns, Egg/Eggless choice, optional other requirements, contact information, and preferred pickup date/time. Initially show “Price confirmed by the baker.” No basket or budget field. |
| Request storage | Save accepted requests with an identifier, submission time, and pending status, independently of notification delivery. |
| Notifications | Separate email and WhatsApp adapters, called by the server after a request is saved. Private recipient details and credentials stay on the server. |
| Shared UI | Buttons, form fields, cards, feedback messages, and visual design tokens. |

## Suggested source layout

```text
src/
  content/
    brand
    products
    enquiry-options
  features/
    storefront/
    catalogue/
    basket/
    orders/
    special-enquiries/
    pickup-contact/
  shared/
    ui/
    validation/
    money/
  server/
    requests/
    storage/
    notifications/
      email/
      whatsapp/
  styles/
    tokens
public/
  images/
```

File extensions and framework entry points will follow the chosen stack. Avoid adding empty abstractions for hypothetical future features.

## Data and submission flow

Products have stable IDs, names, descriptions, egg status, image paths, unit labels, availability, and prices stored as integer paise. Basket entries reference product IDs and positive integer quantities. The server looks up current prices rather than trusting totals supplied by the browser.

Special-enquiry options also have stable IDs and labels. Their model can support optional prices later without requiring them in the first version. Validate submitted selections against configured options on the server.

Both forms submit to server endpoints. The server validates input, saves the request, and queues notifications to the baker by email and WhatsApp. Show an acknowledgement only after the request is saved: “Request received. The baker will contact you to confirm.” This acknowledges receipt, not acceptance of the order or pickup time.

Use a submission identifier to prevent accidental duplicate requests. Track notification delivery separately and support retries so a provider failure does not lose the request or cause a customer to submit it again. Do not claim a notification was delivered merely because a request was saved.

No automatic customer email or WhatsApp acknowledgement in the initial scope. No public WhatsApp chat button. The baker communicates pricing, confirmation, and the pickup address privately.

## Future changes

- Admin editing: replace the content-file reader with a database-backed reader while keeping the catalogue and form interfaces stable.
- Payments: add payment handling after order confirmation without mixing payment state into the basket.
- Pickup slots: replace preferred date/time entry with an availability selector.
- Hosting changes: keep provider-specific storage and notification code behind server adapters.

## Implementation and launch requirements

- Select a web framework, hosting platform, durable storage, and email provider.
- Verify WhatsApp automation requirements with an official provider. The existing WhatsApp Business app alone is not evidence that automated notifications are configured.
- Obtain the baker's private notification destinations and provider credentials through server configuration.
- Replace placeholder products, prices, photos, and enquiry options with approved content.
- Verify basket quantities and totals, both forms' validation, successful request persistence, duplicate submissions, and notification failures/retries.
- Verify mobile layout, keyboard navigation, form labels, and submission feedback.

The first implementation uses native browser modules, a Node.js HTTP server, SQLite persistence, and configurable Resend/Twilio notification adapters. The site runs in preview mode until approved content and provider credentials are supplied. See README.md for setup and deployment constraints.
