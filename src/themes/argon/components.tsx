import {
  TextControl,
  NumberControl,
  BooleanControl,
  SelectControl,
  ObjectControl,
  ListControl,
} from "./forms/controls";

const components = {
  "form.text": TextControl,
  "form.textarea": TextControl,
  "form.number": NumberControl,
  "form.boolean": BooleanControl,
  "form.select": SelectControl,
  "form.object": ObjectControl,
  "form.list": ListControl,
};

export default components;
