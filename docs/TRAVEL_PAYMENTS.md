# Travel bookings, fares, and Stripe setup

Travel booking creates a trip through the `createTravelBooking` callable. The server calculates the fare from `travelPricing/current`; the app cannot choose or change the charge amount. Drivers see only paid, unassigned requests. Stripe PaymentSheet collects payment details, and the server verifies the PaymentIntent before marking a trip paid.

## Local emulator setup

1. Create a Stripe account and use its **test mode** keys. Keep the secret key private; do not paste it into chat or commit it.
2. Add the publishable key to the ignored project-root `.env.local` file:

   ```dotenv
   EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```

3. Add the secret key to `functions/.secret.local`:

   ```dotenv
   STRIPE_SECRET_KEY=sk_test_...
   ```

4. In the Firestore Emulator UI (`http://127.0.0.1:4000/firestore`), create `travelPricing/current` with values approved for your service. Example shape (replace every placeholder with your actual pricing):

   ```json
   {
     "baseFareCents": 0,
     "perKmCents": 0,
     "minimumFareCents": 0,
     "roadDistanceFactor": 1,
     "classMultipliers": {
       "standard": 1,
       "comfort": 1,
       "premium": 1
     },
     "currency": "usd"
   }
   ```

   The server enforces a one-cent minimum charge; replace the zero examples with your approved prices before testing the business flow. `roadDistanceFactor` approximates road distance from straight-line distance; it is not turn-by-turn routing. For accurate route distance and duration, integrate a routing API before launch.

5. Restart the Functions and Expo processes after changing environment files. Stripe's native PaymentSheet requires a development build with the Stripe config plugin; use a physical device for the payment UI. Emulator callable functions still use your configured Stripe **test** account, so test-mode PaymentIntents are real Stripe test objects.

## Production setup

- Store `STRIPE_SECRET_KEY` as a Firebase Functions secret with `firebase functions:secrets:set STRIPE_SECRET_KEY`; deploy only after reviewing your live prices, cancellation/refund policy, and Firebase rules.
- Supply `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` to the build environment. The publishable key is designed for client use; the secret key is not.
- Keep a production pricing document at `travelPricing/current` and grant writes only to administrators.
- Refunds are initiated by the cancellation callable. Stripe can report a refund as pending; the trip records `refund_pending` until the refund outcome is reconciled. A Stripe webhook should be added before launch to reconcile asynchronous payment/refund events and payments completed after a client disconnects.

## Current operational limits

- Fares use configurable server-side values, but road distance is an estimate.
- Trips are dispatched to any verified travel driver who can accept the open request; geographic matching, driver availability enforcement, and dispatch timeouts are not implemented yet.
- School bus tracking and travel driver tracking are separate flows. School driver GPS runs in the foreground during an active school trip; travel driver GPS runs in the travel tracking flow. Neither flow is configured as background location tracking.
- Stripe payment and refunds need credentials and live-device verification before the flow can be called production-ready.
