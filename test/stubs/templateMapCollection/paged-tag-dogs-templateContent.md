---
title: Paged Test
pagination:
  data: collections.dog
  size: 1
---

Before
{% for dog in pagination.items %}
{{ dog.templateContent }}
{% endfor %}
After
