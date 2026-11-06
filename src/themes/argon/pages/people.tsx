"use client";
import { useState } from "react";
import type { PageValue } from "@/generated/pages-contract";
import { UiText, useT } from "@/core/i18n/provider";
import { Button, TextField } from "../components/ui/primitives";
import { Avatar } from "../components/ui/avatar";
import { ActionPopover } from "../components/ui/action-popover";
import { Icon } from "../components/icon";
import styles from "./pages.module.css";

export function PeoplePage({ options }: { options: PageValue["options"] }) {
  const t = useT();
  const [group, setGroup] = useState("");
  const [query, setQuery] = useState("");
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
            <ActionPopover
              key={`${person.id}:${person.name}`}
              panelWidth={380}
              label={t("查看{name}的寄语", {
                name: person.name || t("未命名"),
              })}
              className={
                options?.layout === "cards"
                  ? styles.personCard
                  : styles.personName
              }
              panelClassName={styles.message}
              triggerContent={
                <>
                  <Avatar
                    name={person.name || "?"}
                    src={person.avatar}
                    size={options?.layout === "cards" ? 42 : 28}
                  />
                  <span>
                    {person.name || t("未命名")}
                    {options?.layout === "cards" && (
                      <small>{person.group}</small>
                    )}
                  </span>
                  <Icon name="arrow" />
                </>
              }
            >
              {(close) => (
                <>
                  <div className={styles.messageIdentity}>
                    <Avatar
                      name={person.name || "?"}
                      src={person.avatar}
                      size={56}
                    />
                    <div>
                      <strong>{person.name}</strong>
                      <span>{person.group}</span>
                    </div>
                  </div>
                  <p>{person.message || t("还没有留下寄语。")}</p>
                  <Button onClick={close} className={styles.close}>
                    <UiText text="收起寄语" />
                  </Button>
                </>
              )}
            </ActionPopover>
          ))}
        </div>
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
