"use client";
import { useState } from "react";
import type { CustomPageProps } from "@everunfold/plugin-sdk";
import { UiText, useT } from "@everunfold/plugin-sdk/client";
import { Button, TextField } from "@everunfold/plugin-sdk/client";
import { Avatar } from "@everunfold/plugin-sdk/client";
import { PeopleMessage } from "./message";
import { Icon } from "@everunfold/plugin-sdk/client";
import styles from "./styles.module.css";

export default function PeoplePage({ page }: CustomPageProps) {
  const options = page.options;
  const t = useT();
  const [group, setGroup] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<{ id: number; name: string } | null>(
    null,
  );
  const people = (Array.isArray(options?.people) ? options.people : []).flatMap(
    (value, index) => {
      if (!value || Array.isArray(value) || typeof value !== "object")
        return [];
      return [
        {
          id: index,
          name: typeof value.name === "string" ? value.name : "",
          group: typeof value.group === "string" ? value.group : "",
          message: typeof value.message === "string" ? value.message : "",
          avatar: typeof value.avatar_url === "string" ? value.avatar_url : "",
        },
      ];
    },
  );
  const groups = [
    ...new Set(people.map((person) => person.group).filter(Boolean)),
  ];
  const active = people.find(
    (person) => person.id === selected?.id && person.name === selected.name,
  );
  const current = groups.includes(group) ? group : "";
  const filtered = people.filter(
    (person) =>
      (!current || person.group === current) &&
      (!query ||
        `${person.name} ${person.group}`
          .toLocaleLowerCase()
          .includes(query.toLocaleLowerCase())),
  );
  return (
    <div className={styles.people}>
      {typeof options?.intro === "string" && options.intro && (
        <p className={styles.intro}>{options.intro}</p>
      )}
      <div className={styles.filters}>
        <nav className={styles.groups} aria-label={t("人物分组")}>
          <Button aria-pressed={!current} onClick={() => setGroup("")}>
            <UiText text="全部" />
            <small>{people.length}</small>
          </Button>
          {groups.map((name) => (
            <Button
              key={name}
              aria-pressed={current === name}
              onClick={() => setGroup(name)}
            >
              {name}
              <small>
                {people.filter((person) => person.group === name).length}
              </small>
            </Button>
          ))}
        </nav>
        {options?.search_enabled !== false && (
          <div className={styles.search}>
            <Icon name="search" />
            <TextField
              type="search"
              value={query}
              aria-label={t("搜索人物")}
              placeholder={t("搜索姓名或分组…")}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        )}
      </div>
      {!!people.length && (
        <p className={styles.hint}>
          <Icon name="comment" />
          <UiText text="点开名字，读一段寄语。" />
        </p>
      )}
      {!!filtered.length && (
        <div
          className={
            options?.layout === "cards" ? styles.personCards : styles.cloud
          }
        >
          {filtered.map((person) => (
            <Button
              key={`${person.id}:${person.name}`}
              aria-haspopup="dialog"
              aria-label={t("查看{name}的寄语", {
                name: person.name || t("未命名"),
              })}
              className={
                options?.layout === "cards"
                  ? styles.personCard
                  : styles.personName
              }
              onClick={() => setSelected({ id: person.id, name: person.name })}
            >
              <>
                <Avatar
                  name={person.name || "?"}
                  src={person.avatar}
                  size={options?.layout === "cards" ? 42 : 28}
                />
                <span>
                  {person.name || t("未命名")}
                  {options?.layout === "cards" && <small>{person.group}</small>}
                </span>
                <Icon name="arrow" />
              </>
            </Button>
          ))}
        </div>
      )}
      {active && (
        <PeopleMessage
          key={`${active.id}:${active.name}`}
          person={active}
          onClose={() => setSelected(null)}
        />
      )}
      {!filtered.length && (
        <div className={styles.empty}>
          <Icon name="leaf" />
          <p>
            <UiText
              text={
                people.length
                  ? "没有找到匹配的人物。"
                  : "故事还在继续，等你写下第一个名字。"
              }
            />
          </p>
          {query && (
            <Button onClick={() => setQuery("")}>
              <UiText text="清除搜索" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
