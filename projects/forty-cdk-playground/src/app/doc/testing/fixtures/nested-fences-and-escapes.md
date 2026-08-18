# Fences and escapes the splitter gets right

## Fences

````md
```ts
const side = 'top';
```
````

## Headings inside a fence

```md
## Not a section

| Not | A table |
| --- | ------- |
| a   | b       |
```

## Escaped pipes and raw HTML

| Property | Type | Description |
| -------- | ---- | ----------- |
| `side` | `Side \| undefined` | Press <kbd>Tab</kbd> to move on. |
