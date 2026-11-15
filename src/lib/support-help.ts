const HELP_TOPICS = [
  {
    keywords: ["direction", "navigate", "map", "maps", "route", "gps", "inzira", "ikarita"],
    answer:
      "Open a station and tap Navigate to open directions in your maps app. If your location is missing, allow location access in your browser and refresh Volta.",
  },
  {
    keywords: ["available", "availability", "slot", "busy", "plug", "haboneka", "ahari"],
    answer:
      "Station owners can update available slots in the Owner portal. Set the number available now, then save; drivers can see the count in station details and nearby results.",
  },
  {
    keywords: ["plan", "subscription", "payment", "pay", "pawa", "starter", "pro host", "network", "kwishyura"],
    answer:
      "Owners can select Starter (20,000 RWF/month), Pro Host (145,000 RWF/month), or Network (from 300,000 RWF/month) in the Owner portal. In-app payments are coming soon; selecting a plan does not charge you or activate paid features.",
  },
  {
    keywords: ["add station", "my station", "listing", "owner portal", "station", "sitasiyo", "ongeraho"],
    answer:
      "Sign in, choose Add station, and enter the station name, location, price, and available slots. Use the Owner portal to manage your listings, availability, and plan selection.",
  },
  {
    keywords: ["login", "log in", "sign in", "password", "account", "confirmation", "konti", "ijambobanga"],
    answer:
      "Sign in with the email and password on your Volta account. If you just created an account and confirmation is enabled, use the confirmation link sent to your email before signing in.",
  },
] as const;

export function answerVoltaHelp(question: string): string {
  const normalized = question.trim().toLowerCase();
  const topic = HELP_TOPICS.find(({ keywords }) =>
    keywords.some((keyword) => normalized.includes(keyword)),
  );
  return topic?.answer ??
    "I couldn't find a matching help topic. Contact Volta Support by email or WhatsApp and we'll help you.";
}
