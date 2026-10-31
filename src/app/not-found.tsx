import { TextLink } from "@/themes/argon/components/ui/primitives";
import { failurePage } from "@/core/navigation/failure-page";
export default function NotFound() {
  const page = failurePage(404);
  return (
    <section className="standalone-state">
      <p className="state-code">404</p>
      <h1>{page.title}</h1>
      <p>{page.description}</p>
      <TextLink href="/" className="primary-button">
        返回首页
      </TextLink>
    </section>
  );
}
