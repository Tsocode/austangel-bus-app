# Austangel User Guide

This guide describes features currently present in the app. Some notification and tracking features are still limited; those limits are called out below.

## Contents

- [Getting started](#getting-started)
- [Create an account and sign in](#create-an-account-and-sign-in)
- [Choose or change a service](#choose-or-change-a-service)
- [School Transport](#school-transport)
- [Track a bus](#track-a-bus)
- [Plan a route](#plan-a-route)
- [Map controls and fullscreen](#map-controls-and-fullscreen)
- [Driver and attendant tasks](#driver-and-attendant-tasks)
- [Travel and rides](#travel-and-rides)
- [Settings and notifications](#settings-and-notifications)
- [Location privacy and safety](#location-privacy-and-safety)
- [Troubleshooting](#troubleshooting)
- [Feature index](#feature-index)

## Getting started

1. Open Austangel and choose **School Transport** or **Travel & Rides**.
2. Sign in, or create an account with an email and password that meets the on-screen requirements.
3. Your available screens depend on your account role and its approved assignments. If a bus, child, trip, or admin tool is missing, ask an administrator to check your account setup.

Test accounts in repository-local emulator documentation only work with the local Firebase emulators. They are not public or production accounts.

## Create an account and sign in

Use **Sign Up** to create an account and **Sign In** for an existing account. Use the same email address and selected service associated with your account. Sign-in does not grant a role or bus assignment by itself. Access is controlled by the account profile and Firebase security.

## Choose or change a service

The service selector offers School Transport and Travel & Rides. Choose the service before continuing to its sign-in or app screens. The saved service preference changes which Austangel experience opens; it does not change your role or grant access to another service's data. Return to the service selector from the welcome/sign-in flow when you need to choose the other experience.

## School Transport

The available tabs depend on role. Parents can view buses associated with their children. Drivers use **Driver** to start or finish a trip for their assigned bus. Attendants use **Attendant** to view a roster and record boarding or drop-off check-ins during an active trip. Administrators use **Admin** to manage buses, routes, and assignments.

### Track a bus

Open **Track** and select an available bus when bus choices are shown. Drivers and attendants without an assignment can still use the personal route planner, but live bus tracking requires an assigned bus. The status says **Bus live** when a recent GPS point is available, **GPS signal lost** when the last point is more than two minutes old, or **Waiting for GPS** before the first point arrives. Speed is shown only when the device reports it. Driver and assigned route details depend on the selected bus's stored data.

Parents need an assigned child and that child's bus assignment to see their bus. Drivers and attendants need an administrator to assign them to a bus and route.

### Plan a route

Expand **Plan Your Route** and tap either location field. In the location sheet, search for an address or landmark, choose **My Current Location**, or choose **Choose on Map** and tap the map to place a pin. GPS permission is requested only when you choose current location; if permission is denied, search and map selection remain available. Use **Swap Locations** to reverse the endpoints, then choose **Plan Route**. When the routing service returns them, the app shows an estimated distance and travel time and draws the preview on the map. Search suggestions use configured place search (Photon/OpenStreetMap in the free default setup); route lines use the public OSRM demo routing service. Estimates are not live traffic predictions.

The route preview is stored in local screen state only. Planning, swapping, and clearing it do not change the school's assigned route or stops. Only administrator-managed route data should be treated as official school stops.

### Map controls and fullscreen

- Search for a destination or location using the search field above the map.
- Use **+** and **−** to zoom, the target control to return to the current focus, refresh to reload the displayed location, and expand to open the fullscreen map.
- Fullscreen shows the map, route legend, map controls, and a compact bus status panel. Hide the panel for more map space and tap the bus button to show it again.

Map styling depends on the platform and build. On web, Track currently provides a searchable place map rather than live school bus tracking. Map tiles and public geocoding/routing services require network access.

### Driver and attendant tasks

Drivers start trips from **Driver**, allow foreground location access, and keep Driver Tools active for bus GPS updates. Finish the trip from the same screen. Attendants can record boarding and drop-off check-ins from **Attendant** while a trip is active. If controls are unavailable, ask an administrator to verify the bus, route, and role assignments.

## Travel and rides

Travel users can request a ride by entering pickup and drop-off information. The current fare estimate is not turn-by-turn navigation or traffic-aware dispatch. Payment availability depends on the configured payment service. Drivers need the required verification and trip access before accepting and monitoring rides.

## Settings and notifications

Open **Settings** to change the app appearance, distance units, notification preferences, and account information. Tap a section heading to expand or collapse it. Admin code promotion is verified by the server; never share the code. The Developer section appears only in development builds.

Notification switches currently save preferences on the device. Push trip alerts, delay alerts, and delivered weekly summaries are not active yet, so enabling a switch does not guarantee a notification or summary will be sent.

## Location privacy and safety

School bus GPS is shared while a driver has an active trip and Driver Tools is open with foreground location permission and network access. It can pause if the app is closed or suspended, permission is removed, or connectivity is lost. Background location collection, offline upload, and location-history playback are not implemented.

Only share your trip link with people you trust. Use SOS only for a real safety concern; availability depends on the connected backend. Review the [Privacy Policy](../PRIVACY_POLICY.md) for current data handling details.

## Troubleshooting

### The map has no bus marker

Check that the bus is assigned, the driver has started a trip, Driver Tools remains open, location permission is allowed, and the phone has network access. The Track screen cannot create GPS data when no driver device is publishing it.

### The location looks old

The displayed last-update age is based on the last point received. Ask the driver to check GPS permission, trip status, Driver Tools, and connectivity. GPS can be inaccurate indoors or with a weak signal.

### I cannot see a driver or route

Ask an administrator to verify the bus's driver and route assignments. A test account without demo assignments can sign in but cannot test assigned-bus behavior.

### Route search or preview fails

Check both address fields and network access, then try a more specific address. Photon and the public OSRM demo service may be unavailable or rate-limited; retry later if needed.

### A notification did not arrive

Notification delivery is not active yet. The current switches save local preferences only.

## Feature index

| Term | Meaning |
|---|---|
| Admin | Account role for managing school buses, routes, and assignments. |
| Attendant | School staff role for roster and trip check-ins. |
| Bus live | A recent bus GPS point was received. |
| Driver Tools | Driver screen for trip control and foreground GPS sharing. |
| GPS signal lost | The last received location is older than two minutes. |
| Route preview | A route line built from entered addresses; it is not an assigned trip. |
| School Transport | Austangel's school bus, roster, and trip experience. |
| Travel & Rides | Austangel's ride request and payment experience. |
