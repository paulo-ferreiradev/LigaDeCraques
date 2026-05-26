# Next Steps: Mobile Client Development Roadmap

Since the backend API core logic is 100% complete and fully verified, our roadmap pivots towards the **Mobile Client Interface** inside the `mobile/` directory:

1.  **Mobile Infrastructure Initialisation:**
    *   Initialize a React Native project using **Expo** (`npx create-expo-app`) in the `mobile` folder.
    *   Set up state management (e.g., Zustand or React Context) and HTTP client wrappers (e.g., Axios or Fetch) to interact with the backend API.
2.  **Navigation and Routing:**
    *   Integrate React Navigation or Expo Router.
    *   Define secure routing boundaries: Auth flow (Login, Register screens) vs Protected flow (Tabs for Dashboard, Matches, Payments).
3.  **UI Screen Implementations:**
    *   **Login / Registration Screens:** Collects credentials and stores short-lived Access Tokens / long-lived Refresh Tokens securely.
    *   **Standings Dashboard:** Fetches `/seasons/active/leaderboard` to render a dynamic, sleek league standings table.
    *   **Match Feed Screen:** Renders scheduled and completed matches, displaying scores and MVPs using cursor-based infinite scrolling.
    *   **Payments Screen:**
        *   For normal players: Displays a clean billing feed (Pending/Paid).
        *   For Treasurer/Admin roles: Displays a global payment log with administrative controls to mark payments as Paid or Cancelled.