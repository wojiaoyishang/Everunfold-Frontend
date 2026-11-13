import { BookPage } from "./render";
import { BookCategoryField, BookCoverField } from "./fields";

const components = {
  "core.book.page": BookPage,
  "core.book.cover": BookCoverField,
  "core.book.category": BookCategoryField,
};

export default components;
