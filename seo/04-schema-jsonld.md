# Микроразметка JSON-LD для вставки в Tilda

**Куда вставлять.** Tilda: «Настройки страницы → Дополнительно → HTML-код для вставки внутрь HEAD».
Либо блок `T123` (HTML-код) в тело страницы — для JSON-LD работают оба варианта.

**Как проверять после вставки.** Опубликовать страницу, затем:
- search.google.com/test/rich-results
- webmaster.yandex.ru/tools/microtest

Обе проверки обязательны: у Яндекса и Google требования расходятся, и валидная для одного
разметка может не пройти у другого.

⛔ **Главное правило.** Разметка описывает то, что есть на странице. Если в JSON-LD указан
рейтинг 4.9, а на странице нет отзывов — это не «улучшение сниппета», это основание для
санкций. Всё, что помечено `ЗАПОЛНИТЬ`, — заполнить настоящими данными или удалить блок целиком.

⚠️ **Я не знаю, есть ли на сайте разметка сейчас.** Домен закрыт, а проверить JSON-LD через
загрузку HTML нельзя в принципе: плагины часто вставляют его скриптом уже в браузере.
Сначала прогоните текущие страницы через Rich Results Test — возможно, часть разметки уже стоит,
и тогда её надо дополнять, а не дублировать. **Два одинаковых блока `EducationalOrganization`
на одной странице — ошибка.**

---

## 1. Главная страница — EducationalOrganization

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  "name": "Fair Winds",
  "alternateName": "Онлайн-школа английского языка Fair Winds",
  "description": "Онлайн-школа английского языка для детей и подростков 7–15 лет. Групповые занятия в мини-группах, уроки полностью на английском, кембриджская программа.",
  "url": "https://fairwinds.school/",
  "logo": "https://fairwinds.school/ЗАПОЛНИТЬ-путь-к-логотипу.png",
  "image": "https://fairwinds.school/ЗАПОЛНИТЬ-путь-к-картинке.jpg",
  "email": "ЗАПОЛНИТЬ",
  "telephone": "ЗАПОЛНИТЬ",
  "areaServed": {
    "@type": "Country",
    "name": "Россия"
  },
  "sameAs": [
    "https://t.me/FairWindsschool",
    "https://vk.com/fairwinds07",
    "https://www.instagram.com/fairwinds.school"
  ]
}
</script>
```

**Заполнить:** `logo`, `image`, `email`, `telephone`.
**Проверить `sameAs`:** ссылки взяты из `product-marketing.md`, §13. Убедиться, что все три актуальны и открываются. Битая ссылка в `sameAs` — сигнал небрежности; лучше убрать строку, чем оставить нерабочую.

---

## 2. Страница курса — Course

Ставится на `/angliyskiy-detyam`, `/angliyskiy-shkolnikam` и на страницы уровней.
Пример — курс для детей 7–11 лет.

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Course",
  "name": "Английский для детей 7–11 лет онлайн",
  "description": "Групповой курс английского языка для детей 7–11 лет. Занятия онлайн в мини-группах, уроки ведутся полностью на английском.",
  "url": "https://fairwinds.school/angliyskiy-detyam",
  "inLanguage": "ru",
  "teaches": "Английский язык",
  "educationalLevel": "Начальный",
  "provider": {
    "@type": "EducationalOrganization",
    "name": "Fair Winds",
    "url": "https://fairwinds.school/"
  },
  "hasCourseInstance": {
    "@type": "CourseInstance",
    "courseMode": "Online",
    "courseWorkload": "ЗАПОЛНИТЬ — например PT60M",
    "instructor": {
      "@type": "Person",
      "name": "ЗАПОЛНИТЬ — имя преподавателя"
    }
  }
}
</script>
```

**Заполнить:** `courseWorkload` (длительность занятия в формате ISO 8601: `PT30M` = 30 минут, `PT60M` = 60 минут — в `product-marketing.md` зафиксирован разброс 30–60 минут по возрастам, точных данных нет), `instructor`.

### Блок цены — включать только после фиксации тарифов

⛔ Сейчас цена одной и той же услуги расходится в 2,5 раза (`product-marketing.md`, §14.2).
Ставить `offers` при таком разбросе нельзя: цена в разметке обязана совпадать с ценой на
странице, иначе расширенный сниппет снимается.

После того как сетка из §16.3 зафиксирована — добавить внутрь `Course`:

```json
  "offers": {
    "@type": "Offer",
    "price": "ЗАПОЛНИТЬ",
    "priceCurrency": "RUB",
    "category": "Paid",
    "availability": "https://schema.org/InStock",
    "url": "https://fairwinds.school/tseny"
  }
```

---

## 3. Блок вопросов и ответов — FAQPage

Ставится на любую страницу, где на самой странице **видимо** размещены вопросы и ответы.
Разметить вопросы, которых на странице нет, — нарушение.

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Ребёнок совсем не знает английского — подойдёт ли занятие целиком на английском?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "ЗАПОЛНИТЬ — ответ должен дословно совпадать с текстом на странице."
      }
    },
    {
      "@type": "Question",
      "name": "Сколько детей в группе?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "ЗАПОЛНИТЬ"
      }
    },
    {
      "@type": "Question",
      "name": "Что будет, если ребёнок пропустит занятие?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "ЗАПОЛНИТЬ"
      }
    },
    {
      "@type": "Question",
      "name": "Можно ли оплатить обучение материнским капиталом?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "ЗАПОЛНИТЬ"
      }
    }
  ]
}
</script>
```

**Вопросы выбраны не наугад** — это реальные возражения из `product-marketing.md`, §7 и §15.6. Ответы на них у школы есть, на сайте они, судя по всему, не собраны в одном месте.

---

## 4. Хлебные крошки — BreadcrumbList

На все страницы кроме главной. Даёт в выдаче путь вместо голого URL — заметно улучшает вид сниппета.

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Главная",
      "item": "https://fairwinds.school/"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "Курсы",
      "item": "https://fairwinds.school/kursy"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "Английский детям 7–11 лет",
      "item": "https://fairwinds.school/angliyskiy-detyam"
    }
  ]
}
</script>
```

⚠️ Крошки в разметке должны соответствовать видимым крошкам на странице и реальной структуре URL. Если раздела `/kursy` не существует — убрать вторую ступень.

---

## 5. Статья блога — Article

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "ЗАПОЛНИТЬ — заголовок статьи, до 110 символов",
  "description": "ЗАПОЛНИТЬ",
  "image": "ЗАПОЛНИТЬ",
  "datePublished": "ЗАПОЛНИТЬ — формат 2026-09-15",
  "dateModified": "ЗАПОЛНИТЬ",
  "author": {
    "@type": "Person",
    "name": "ЗАПОЛНИТЬ — имя автора"
  },
  "publisher": {
    "@type": "EducationalOrganization",
    "name": "Fair Winds",
    "logo": {
      "@type": "ImageObject",
      "url": "https://fairwinds.school/ЗАПОЛНИТЬ-логотип.png"
    }
  }
}
</script>
```

**Про `author`.** Указывать живого человека с именем, а не «Администратор» и не «Fair Winds». Обучение детей — тематика, где поисковики отдельно оценивают экспертность автора. У школы есть узнаваемый эксперт — Missis Evans, 34 ученика, больше всех (`product-marketing.md`, §15.4). Это готовое авторское имя, которое уже работает как суббренд. Под ним же имеет смысл завести страницу автора со списком статей и профессиональной биографией.

---

## Чего здесь сознательно нет

**`AggregateRating` и `Review`.** Это самая заманчивая разметка — она даёт звёздочки в выдаче
и поднимает кликабельность. И самая опасная: рейтинг должен опираться на настоящие отзывы,
собранные и опубликованные на странице. Выдуманный или «примерно прикинутый» рейтинг —
основание для ручных санкций.

Порядок действий правильный: сначала собрать реальные отзывы с согласием на публикацию,
опубликовать их на странице, и только потом размечать. Из `product-marketing.md`, §15.8:
нехватка отзывов зафиксирована ещё в 2024 году и, судя по всему, не закрыта.
