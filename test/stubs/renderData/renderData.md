---
key1: value1
renderData:
  key2: value2-{{ key1 }}.css
---

<title>{{ renderData.key2 }}</title>
