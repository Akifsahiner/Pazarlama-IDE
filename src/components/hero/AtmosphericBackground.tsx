/**
 * Cluely hero atmosphere — sky blue + warm orange only. No purple/pink.
 */
export function AtmosphericBackground() {
  return (
    <div className="cluely-atmosphere" aria-hidden="true">
      <div className="cluely-atmosphere__sky" />
      <div className="cluely-atmosphere__warmth" />
      <div className="cluely-atmosphere__light-blend" />
      <div className="cluely-atmosphere__horizon" />
      <div className="cluely-atmosphere__sun" />
      <div className="cluely-atmosphere__flare" />
      <div className="cluely-atmosphere__noise" />
    </div>
  );
}
