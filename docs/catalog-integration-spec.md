# Задание на подключение каталога товаров и категорий

## Результат и статус

Подключить согласованные экраны каталога и категорий к Java API с сохранением в PostgreSQL. Функционал описан в `catalog-functional.md`, приёмка — в `catalog-acceptance.md`. Владелец проверил прототип; подтверждение UI не означает готовность API или внедрение.

Фронт для проверки подготовлен в `src/modules/products/catalogIntegration/`, на JavaScript/JSX, React 19, zustand, axios, react-hook-form и zod. Серверная реализация предложенного контракта ещё требуется. Ветка не должна автоматически внедряться на рабочий сервер.

Исходные версии: frontend `klyndykaleks-lab/kaspay-admin`, main `7f5ff70b988634199c5a73214dc08ddbf32b90dd`; backend `klyndykaleks-lab/kaspay`, main `e7ebe4dd223ea2f4aab7187abcb5a990006666ac`; Lovable `2e5252ec97de297c3422fcca257a74fe2741d2df`. Разработчикам нужно сверить эти версии с фактически развёрнутым тестовым окружением: URL и версия Swagger этого окружения пока не предоставлены.

## Подтверждённые расхождения с текущим API

| Область | В текущем исходном коде | Требуемая доработка |
| --- | --- | --- |
| Список товаров | GET products принимает page, size, shortName, barcode; только активные; фильтры сочетаются через И | Единый поиск через ИЛИ по двум названиям, категории, штрихкоду; фильтр active/inactive/all до пагинации |
| Активность | ProductDto не содержит isActive; mergeProduct всегда задаёт true | Возвращать isActive; отдельный метод изменения; обычное редактирование не меняет активность |
| Удаление | DELETE products/{id} отключает при наличии поставок, иначе удаляет товар и фото | Не использовать для переключателя; отдельные операции с однозначной семантикой |
| Категории | GET products/categories; DTO id/name/subCategories; описание и isActive существуют в entity, но не возвращаются | Возвращать описание и активность, создать CRUD и переключение, защитить уникальность и ссылки |
| Поля карточки | weight и countryCode обязательны, country в БД nullable=false; ingredients not null | Разрешить null веса и страны, пустой состав; адаптировать mapper и LEFT JOIN страны |
| КБЖУ | Integer в DTO и attributes | Сохранять дробные значения, например 10.6 г, без округления и потери точности |
| Единицы | В карточке нет unit; ProductQuantityUnitType содержит только pcs | Хранить и возвращать pcs/ml/gr; не обещать поддержку во всех цепочках учёта без отдельных тестов |
| Фото | Отдельные POST/DELETE images; изменения карточки и фото независимы | Атомарная запись карточки с намерением изменения фото; проверка на сервере |
| Дубли | Индекс tenant/barcode есть, уникальность не обеспечена | Уникальность штрихкода и нормализованного имени категории внутри tenant, включая неактивные |

Пути текущих источников: ProductController, CategoryController, ProductRequestDto, ProductDto, MacronutrientsDto, CreationAndUpdatingProductUseCase, DeactivateProductUseCase, ProductRepository, ProductCategory и V1__schema_creation.sql. Старые методы сохраняются для других разделов; их семантика не меняется скрытно.

## Предложенный контракт версии 2

Ниже новые методы, которые требуется реализовать и подтвердить через OpenAPI. Это предложение интеграции, а не описание уже работающих эндпоинтов. Базовый путь `/web/admin-api/v1`; существующий axios уже добавляет baseURL и X-BID-Token. Tenant определяется сервером из авторизации, не из тела запроса.

| Метод и относительный путь | Вход | Успех |
| --- | --- | --- |
| GET products/catalog/capabilities | Без параметров | contractVersion: 2, atomicProductPhoto: true, idempotentCreate: true |
| GET products/catalog | page от 1, size 10/20/50, query, state active/inactive/all | PageDto items/totalItems/totalPages/page/pageSize |
| GET products/catalog/validation | barcode, name, excludeId при редактировании | barcodeDuplicate: null или {id,name}; nameDuplicate: null или {id,name} |
| POST products/catalog | multipart product JSON + необязательный file; Idempotency-Key | 201 ProductDtoV2 |
| PUT products/catalog/{id} | multipart product JSON + необязательный file; version в product | 200 ProductDtoV2 |
| PATCH products/catalog/{id}/active | {isActive,version} | 200 ProductDtoV2 с новым version |
| DELETE products/catalog/{id} | version в query | 204; при ссылках 409, товар не отключается вместо удаления |
| GET products/categories | includeInactive=true | Полный список доступных категорий с description/isActive/version и сохранёнными subCategories |
| POST products/categories | {name,description} | 201 CategoryDtoV2; isActive=true |
| PUT products/categories/{id} | {name,description,version} | 200 CategoryDtoV2; активность не меняется |
| PATCH products/categories/{id}/active | {isActive,version} | 200 CategoryDtoV2 |
| DELETE products/categories/{id} | version в query | 204; 409 при связанных товарах или дочерних категориях |
| GET countries | Текущий контракт | [{code,name}]; BLR — Беларусь |
| GET images/{imagePath} | Текущий авторизованный метод | Binary Blob |

GET capabilities — защита от запуска на старом API. Объявлять версию 2 только после реализации всех перечисленных возможностей. У GET categories оставить текущую форму массива и subCategories; новые поля добавить без удаления старых. Иерархию существующих категорий не уничтожать. Редактор этого этапа изменяет название и описание, не переносит категории между родителями.

ProductDtoV2: `{id,name,shortName,barcode,category:{id,name,description,isActive,version},weight,country:{code,name}|null,ingredients,unit,macronutrients:{calories,proteins,fat,carbohydrates},imagePath,isActive,version}`. ID — строки, version — неотрицательное целое. Все методы записи возвращают актуальную версию; stale version даёт 409 VERSION_CONFLICT без записи.

JSON part `product` имеет Content-Type application/json. Поля: name, shortName, barcode, categoryId, weight (число или null), countryCode (BLR/другой код/null), ingredients (строка, пустая допустима), unit (pcs/ml/gr), macronutrients (неотрицательные числа, дробные разрешены), photoAction (keep/remove/replace), version для PUT. При replace file обязателен; при keep/remove file отсутствует. PUT с keep сохраняет старое изображение. Новое фото до 1 048 576 байт и 150 × 150 пикселей, jpeg/jpg/png, без автоматического масштабирования. При создании активность true; PUT не активирует отключённый товар.

Пример JSON part: `{"name":"Напиток газированный 0.5 л","shortName":"Напиток 0.5 л","barcode":"0001234567890","categoryId":"12","weight":null,"countryCode":"BLR","ingredients":"","unit":"pcs","macronutrients":{"calories":42,"proteins":0,"fat":0,"carbohydrates":10.6},"photoAction":"keep"}`.

## Надёжность записи и ограничения

POST с тем же Idempotency-Key и тем же содержимым должен возвращать ранее созданный товар без повторной вставки; ключ изолирован tenant и пользователем. При том же ключе с другим содержимым — 409 IDEMPOTENCY_CONFLICT. Фронт повторяет ключ для повторной отправки того же черновика и меняет при изменении черновика. Для PUT и переключателей используется version. Полный повтор PUT с устаревшей версией не создаёт новую карточку; сервер возвращает конфликт, пользователь обновляет данные.

Карточка и фото должны подтверждаться как одна операция. Сначала проверить поля, уникальность, права и фото; разместить новый файл временно; применить запись БД; после успешного commit очистить прежний файл. При ошибке сохранить старую карточку и старый файл, удалить временный файл. Файловое хранилище и БД не имеют общей транзакции: требуется компенсирующая очистка, журнал/повтор очистки и тесты сбоя commit и файлового хранилища. Не реализовывать front как POST товара → POST фото с сообщением общего успеха при частичном сбое.

Серверная уникальность: barcode после trim — внутри tenant, без преобразования в число, включая неактивные товары. Категория: normalizeName = trim → схлопывание пробелов → сравнение без регистра; уникальное нормализованное имя внутри tenant, включая неактивные. Перед уникальным индексом составить список существующих дублей; автоматическое удаление/слияние без отдельного решения запрещено. Два одновременных запроса проверяются ограничением БД, проигравший получает 409.

При новом назначении категории проверять её tenant и активность; существующая неактивная категория допустима при редактировании без переназначения. Удаление категории запрещено при любых привязанных товарах, включая неактивные, и дочерних категориях. Отключение категории не отключает товары. Все действия ограничены текущим tenant, чужой ID не даёт доступ. businessUser — запись; businessUser/deviceServicer — чтение согласно текущим аннотациям. Модель франчайзер/франчайзи пока не расширяется.

Единицы и КБЖУ: для чисел использовать типы, сохраняющие дробную часть (BigDecimal/decimal или эквивалент), nullable weight, nullable country relation; ингредиенты могут остаться not null с пустой строкой. Страна mapper должна поддерживать null. JOIN страны в запросах заменить LEFT JOIN. unit — атрибут товара, миграция существующих товаров default pcs; учёт МЛ/ГР в остатках и продажах — отдельный согласуемый этап, не конвертировать существующие количества автоматически.

Ошибка JSON: `{code,message,field?}`. 400 — ошибка полей/фото; 401 — авторизация; 403 — права; 404 — недоступный объект; 409 — DUPLICATE_BARCODE, DUPLICATE_CATEGORY, CATEGORY_IN_USE, PRODUCT_IN_USE, VERSION_CONFLICT, IDEMPOTENCY_CONFLICT. Не включать сведения о чужом tenant в текст ошибки. Поле field соответствует имени формы, например barcode/name/weight.

## Подготовленный фронт и порядок подключения

1. Сверить фактические тестовые frontend/backend ветки и Swagger с указанными исходниками. Если активный фронт другой, перенести новый подмодуль и две точки подключения после ревью; не копировать весь старый репозиторий поверх нового.
2. Реализовать и проверить контракт API, миграции, уникальность, nullable-поля, version, file lifecycle и tenant. Обновить Swagger примерами и ошибками. Backend security PR проверяется отдельно; задачи надёжности цепочек заказов и интеграционных тестов заказов остаются на паузе.
3. В тестовом frontend задать существующие VITE_SERVER_URL/VITE_VERSION_API и `VITE_CATALOG_V2=true`. Без флага остаётся существующий каталог. Даже с флагом новый модуль не запускается без GET capabilities версии 2.
4. Прогнать `node --test tests/catalog.test.js`, lint изменённых файлов и `npm run build`, затем полный чеклист приёмки с реальной БД и двумя ролями/tenant.
5. Разработчики записывают результат, замечания, commit/backend build и тестовую ссылку в журнал. Только после совместной приёмки согласовать внедрение и отдельно запускать штатный deployTest/deployProd. Этот PR не выполняет deploy.

Подготовленный модуль не использует localStorage для товаров, не переносит mock данные Lovable и не подменяет API успехом. Авторизация остаётся в существующем axios. В PR добавлены формы, фильтры, серверная пагинация, категории, переключатели, загрузка фото в черновик, предупреждения дублей и ошибки с сохранением формы. Прототип на TypeScript не копируется напрямую в JavaScript проект.

## Выполненная проверка и оставшаяся приёмка

Локально прошли сборка Vite, ESLint изменённых файлов и 7 автоматических тестов чистых правил. Реальные сетевые запросы, браузерная приёмка нового JSX-модуля, права, миграции, атомарность фото и гонки PostgreSQL ещё не проверены: нужный backend контракт отсутствует. Проверки прототипа Lovable не заменяют интеграционные проверки подготовленного фронта.
