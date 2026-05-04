export const buildSosMessage = (userName: string, trackUrl: string) =>
  `🚨 EMERGENCY ALERT 🚨\n\n${userName} has triggered an SOS and may need immediate help.\n\nLive location: ${trackUrl}\n\nSent via HolarcHelp.`;

export const waLink = (phone: string, message: string) => {
  const clean = phone.replace(/[^\d]/g, "");
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
};
