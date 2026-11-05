import { UiText } from "@/core/i18n/provider";
import { AppLink as Link } from "./navigation-link";
import { Icon } from "./icon";

export function EmptyState({
  title = "这里还没有文章",
  description = "换一个分类，或看看其他故事吧。",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <section className="surface empty-state">
      <Icon name="book" />
      <h2>
        <UiText text={title} />
      </h2>
      <p>
        <UiText text={description} />
      </p>
      <Link href="/" className="primary-button">
        <UiText text="回到首页" />
      </Link>
    </section>
  );
}
