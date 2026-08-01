const PASSPORT_LOGO_SRC = "https://cdn.jsdelivr.net/gh/jdecked/twemoji@17.0.3/assets/72x72/1f6c2.png";

export function PassportLogo() {
  return (
    // Twemoji's passport-control PNG is used as the RouteStamp brand mark.
    // eslint-disable-next-line @next/next/no-img-element
    <img className="brand-mark" src={PASSPORT_LOGO_SRC} alt="" aria-hidden="true" />
  );
}
