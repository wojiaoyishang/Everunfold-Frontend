/** Public widget capability. The server owns verification and never exposes its secret. */
export interface CaptchaWidgetProps {
  siteKey: string;
  challengeId: string;
  onChange: (token: string) => void;
  onError: () => void;
}
