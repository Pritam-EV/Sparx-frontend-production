1. Purpose of this Component
Your LiveSessionPage is part of your EV charging frontend for monitoring and controlling an active charging session.

It’s designed to:

Display charger info, session details, and live telemetry (energy consumed, voltage, current)

Animate the "charging car" graphic fill level

Sync with backend API every few seconds

Provide a "STOP CHARGING" button (end session)

Show more info in a popup


2. Key Features
Props / Routing Data
Uses useLocation() to get location.state (session details passed from previous page).

Fallback class LocationState for default values.

Extracts from location state:

sessionId

deviceId

energySelected

amountPaid

transactionId

startDate / startTime

⚠ Important: This component will break or show blanks if location state is not properly passed when navigating here (e.g., user reloads mid-session).



State Variables
isLoading, error

sessionData — updated every 5 sec from /api/sessions/active

deviceDetails — fetched once from /api/devices/public/:deviceId

voltage, current, energyConsumed — currently hardcoded 0 (no fetching yet)

relayState — fixed 'OFF' (never updated)

showPopup — controls popup visibility


Derived Values
usagePercent — (energyConsumed / energySelected) * 100

isFull — usagePercent >= 100

amountUtilized — proportion of amountPaid for energyConsumed

Right now, because energyConsumed is fixed at 0, these values will always read empty/zero.


