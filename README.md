# MikroTik Monitor

Monitoring the availability of a **MikroTik** router using **Cloudflare Workers, KV Storage, and PWA**.

The router independently sends a heartbeat request to the Cloudflare Worker over HTTPS. The Worker stores the time of the last signal in Cloudflare KV. The web interface periodically retrieves the status and shows whether the router is online.

The project does not require opening any incoming ports on the MikroTik router.

---

## Features

- Monitoring MikroTik router availability via heartbeat
    
- Cloudflare Workers as the backend
    
- Cloudflare KV for state storage
    
- Heartbeat authorization using a secret token
    
- Web interface without a separate backend server
    
- PWA — can be installed as an application on a smartphone
    
- Automatic status updates
    
- Displaying the time of the last heartbeat
    
- Real-time display of the last signal
    
- Automatic `ONLINE / OFFLINE` detection
    
- Works without incoming connections to the MikroTik router
    
- Service Worker with interface caching
    

---

## Architecture

```text
                    HTTPS POST
                 every 30 seconds
                       │
                       ▼
┌──────────────────────────────┐
│          MikroTik            │
│                              │
│      RouterOS Scheduler      │
└──────────────┬───────────────┘
               │
               │ Authorization:
               │ Bearer TOKEN
               ▼
┌──────────────────────────────┐
│      Cloudflare Worker       │
│                              │
│ POST /api/heartbeat          │
│ GET  /api/status             │
└──────────────┬───────────────┘
               │
               │ KV
               ▼
┌──────────────────────────────┐
│    Cloudflare KV Storage     │
│                              │
│       key: mikrotik          │
│       lastSeen: timestamp    │
└──────────────┬───────────────┘
               │
               │ GET /api/status
               ▼
┌──────────────────────────────┐
│          PWA / Web           │
│                              │
│       ONLINE / OFFLINE       │
└──────────────────────────────┘
```

### How It Works

1. The MikroTik router starts the RouterOS Scheduler.
    
2. Every 30 seconds, an HTTPS POST request is sent to the Worker.
    
3. The Worker checks `Authorization: Bearer ...`.
    
4. If authorization is successful, the current time is stored in KV.
    
5. The web interface requests `/api/status` every 5 seconds.
    
6. The Worker returns the time of the last heartbeat.
    
7. If the last heartbeat was received less than 90 seconds ago, the router is considered `ONLINE`.
    
8. If no heartbeat has been received for more than 90 seconds, the router is considered `OFFLINE`.
    

---

# Project Structure

```text
mikrotik-monitor/
│
├── src/
│   └── index.ts
│
├── public/
│   ├── index.html
│   ├── style.css
│   ├── app.js
│   ├── manifest.webmanifest
│   ├── sw.js
│   │
│   └── icons/
│       ├── icon-192.png
│       └── icon-512.png
│
├── .gitignore
├── README.md
├── package.json
├── package-lock.json
├── tsconfig.json
└── wrangler.jsonc
```

### `src/index.ts`

Cloudflare Worker backend.

Handles:

```text
POST /api/heartbeat
GET  /api/status
```

### `public/index.html`

Main HTML markup of the interface.

### `public/style.css`

Web interface styles.

### `public/app.js`

Frontend logic:

- retrieving the status;
    
- updating the interface;
    
- heartbeat age counter;
    
- displaying the last check time;
    
- registering the Service Worker.
    

### `public/manifest.webmanifest`

PWA Manifest.

Allows the monitor to be installed as an application on supported devices.

### `public/sw.js`

Service Worker.

Used for caching static interface files and providing PWA functionality.

### `wrangler.jsonc`

Configuration for Cloudflare Workers and KV.

---

# Security

The heartbeat is protected by a secret token.

The Worker expects the following HTTP header:

```text
Authorization: Bearer YOUR_TOKEN
```

The token is **not stored in the project source code**.

Cloudflare Workers uses the following Secret:

```text
HEARTBEAT_TOKEN
```

---

# Requirements

The following are required to install the project:

- Node.js
    
- npm
    
- Cloudflare account
    
- Cloudflare Workers
    
- Cloudflare KV
    
- MikroTik router with RouterOS 7
    

Check the Node.js version:

```bash
node --version
```

Check npm:

```bash
npm --version
```

Check Wrangler:

```bash
npx wrangler --version
```

---

# Installation

## 1. Clone the Repository

```bash
git clone https://github.com/fsdevcom2000/mikrotik-monitor.git
cd mikrotik-monitor
```

---

## 2. Install Dependencies

```bash
npm install
```

---

# Create KV Namespace

Create a KV namespace:

```bash
npx wrangler kv namespace create ROUTER_STATUS
```

Wrangler will output something similar to:

```text
id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

Add the returned ID to `wrangler.jsonc`.

Example:

```json
{
	"name": "mikrotik-monitor",
	"main": "src/index.ts",
	"compatibility_date": "2026-09-03",

	"kv_namespaces": [
		{
			"binding": "ROUTER_STATUS",
			"id": "YOUR_KV_NAMESPACE_ID"
		}
	],

	"assets": {
		"directory": "./public"
	}
}
```

---

# Create Secret Token

Create a Cloudflare Secret:

```bash
npx wrangler secret put HEARTBEAT_TOKEN
```

Wrangler will prompt you to enter the value.

Use a long, random token.

For example:

```text
a-long-random-secret-token
```

Check the list of configured secrets:

```bash
npx wrangler secret list
```

---

# Local Development

To run the Worker locally:

```bash
npm run dev
```

After starting, Wrangler will display the local address, for example:

```text
http://localhost:8787
```

---

# API

#### GET `/api/status`

Returns the current status of the MikroTik router.

Example:

```json
{
	"online": true,
	"lastSeen": 1788378429236,
	"age": 37699
}
```

### Fields

|Field|Description|
|---|---|
|`online`|Whether the router is online|
|`lastSeen`|Unix timestamp of the last heartbeat|
|`age`|Heartbeat age in milliseconds|

If no heartbeat has ever been received:

```json
{
	"online": false,
	"lastSeen": null,
	"age": null
}
```

---

#### POST `/api/heartbeat`

Used by the MikroTik router to send a heartbeat.

The following header is required:

```text
Authorization: Bearer YOUR_TOKEN
```

Example request:

```http
POST /api/heartbeat
Authorization: Bearer YOUR_TOKEN
```

On a successful request, the Worker returns:

```json
{
	"ok": true,
	"lastSeen": 1788378429236
}
```

With an invalid token:

```text
401 Unauthorized
```

---

# MikroTik Router Configuration

On the MikroTik router, create a scheduled task that runs the heartbeat script.

Example script:

```routeros
:local url "https://YOUR-WORKER.workers.dev/api/heartbeat"

    :local token "YOUR_TOKEN"

    :do {

        /tool fetch url=$url http-method=post http-data="" http-header-field=("Authorization: Bearer " . $token) output=none

        :log info "RouterCheck: heartbeat sent"

    } on-error={

        :log warning "RouterCheck: heartbeat failed"

    }
```

---

## Manual Heartbeat Test

For testing:

```routeros
/tool fetch url="https://YOUR-WORKER.workers.dev/api/heartbeat" http-method=post http-data="" http-header-field="Authorization: Bearer YOUR_TOKEN" output=user
```

If the request is successful, the Worker should return JSON containing `ok: true`.

After that, check the status:

```routeros
/tool fetch url="https://YOUR-WORKER.workers.dev/api/status" output=user
```

Expected result:

```json
{
	"online": true,
	"lastSeen": 1788378429236,
	"age": 1234
}
```

---

# Timeout

The Worker uses:

```typescript
const OFFLINE_TIMEOUT = 90_000;
```

This means:

```text
90 000 ms = 90 seconds
```

With a heartbeat interval of 30 seconds, the system allows one or more missed requests.

Logic:

```text
Heartbeat every 30 seconds
        │
        ├── < 90 sec → ONLINE
        │
        └── >= 90 sec → OFFLINE
```

If necessary, the value can be changed in:

```text
src/index.ts
```

For example:

```typescript
const OFFLINE_TIMEOUT = 120_000;
```

for a 120-second timeout.

---

# PWA

The project supports Progressive Web App.

After opening the website on a mobile device, it can be installed on the home screen.

The PWA consists of:

```text
manifest.webmanifest
sw.js
icons/
```

The Manifest contains:

- application name;
    
- short name;
    
- icons;
    
- interface color;
    
- `standalone` mode;
    
- application orientation.
    

---

# Service Worker

The Service Worker caches static interface files:

```text
/
index.html
style.css
app.js
manifest.webmanifest
```

API requests:

```text
/api/*
```

are **not cached**.

Static files are first requested from the network. If the network is unavailable, the cached version is used.

This allows the interface to be opened even during a temporary loss of connectivity.

---

# Deployment

To deploy the Worker:

```bash
npm run deploy
```

or:

```bash
npx wrangler deploy
```

After a successful deployment, Wrangler will display the Worker URL.

For example:

```text
https://YOUR-WORKER.workers.dev/api/heartbeat
```

This URL must be used in the MikroTik router script.

---

# Development

TypeScript check:

```bash
npx tsc --noEmit
```

Local development:

```bash
npm run dev
```

Deployment:

```bash
npm run deploy
```

---

# Updating the Project

After modifying frontend files:

```text
public/index.html
public/style.css
public/app.js
public/manifest.webmanifest
public/sw.js
```

run:

```bash
npm run deploy
```

The Service Worker uses the following cache version:

```javascript
const CACHE_NAME = "mikrotik-monitor-v1";
```

When making significant interface changes, it is recommended to increase the version:

```javascript
const CACHE_NAME = "mikrotik-monitor-v2";
```

This will force the Service Worker to create a new cache.

---

# Intervals

The following values are used by default:

|Parameter|Value|
|---|--:|
|MikroTik heartbeat|30 sec|
|Frontend check|5 sec|
|Local counter|1 sec|
|Offline timeout|90 sec|

Heartbeat:

```text
MikroTik → Worker
every 30 seconds
```

Status check:

```text
Browser → Worker
every 5 seconds
```

---

# Why You Don't Need to Open Router Ports to the Internet

The project uses an **outbound heartbeat** approach.

The MikroTik router establishes the HTTPS connection itself:

```text
MikroTik
   │
   │ HTTPS OUT
   ▼
Cloudflare Worker
```

The Worker does not establish a connection back to the router.

Therefore, the following are not required:

- port forwarding;
    
- public IP address;
    
- VPN;
    
- open HTTP/HTTPS port on the MikroTik router;
    
- incoming connection to the router.
    

This is especially useful for connections behind NAT/CGNAT.

---

# Technologies

The project uses:

- **Cloudflare Workers**
    
- **Cloudflare KV**
    
- **TypeScript**
    
- **JavaScript**
    
- **HTML5**
    
- **CSS3**
    
- **PWA**
    
- **Service Worker**
    
- **MikroTik RouterOS**
    
- **Wrangler**
    
- **Node.js / npm**
    

---

# Project Idea

MikroTik Monitor is designed to provide a simple and independent way to monitor the availability of a MikroTik router without deploying a separate VPS, database, or backend.

The entire monitoring infrastructure can run on Cloudflare:

```text
MikroTik router
    ↓
HTTPS
    ↓
Cloudflare Worker
    ↓
Cloudflare KV
    ↓
PWA
```

Minimal infrastructure, no incoming connections, and the ability to install the interface as a mobile application.

---
# License 

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

# MikroTik Monitor

Мониторинг доступности роутера **MikroTik** с использованием **Cloudflare Workers, KV Storage и PWA**.

Роутер самостоятельно отправляет heartbeat-запрос на Cloudflare Worker через HTTPS. Worker сохраняет время последнего сигнала в Cloudflare KV. Веб-интерфейс периодически получает статус и показывает, находится ли роутер онлайн.

Проект не требует открытия входящих портов на роутере MikroTik.

---

## Возможности

- Контроль доступности роутера MikroTik через heartbeat
    
-  Cloudflare Workers в качестве backend
    
-  Cloudflare KV для хранения состояния
    
-  Авторизация heartbeat через секретный токен
    
-  Веб-интерфейс без отдельного backend-сервера
    
-  PWA — можно установить как приложение на смартфон
    
-  Автоматическое обновление статуса
    
-  Отображение времени последнего heartbeat
    
-  Отображение последнего сигнала в реальном времени
    
-  Автоматическое определение `ONLINE / OFFLINE`
    
-  Работает без входящих подключений к роутеру MikroTik
    
-  Service Worker с кэшированием интерфейса
    

---

## Архитектура

```text
                    HTTPS POST
                каждые 30 секунд
                       │
                       ▼
┌──────────────────────────────┐
│          MikroTik            │
│                              │
│      RouterOS Scheduler      │
└──────────────┬───────────────┘
               │
               │ Authorization:
               │ Bearer TOKEN
               ▼
┌──────────────────────────────┐
│      Cloudflare Worker       │
│                              │
│ POST /api/heartbeat          │
│ GET  /api/status             │
└──────────────┬───────────────┘
               │
               │ KV
               ▼
┌──────────────────────────────┐
│    Cloudflare KV Storage     │
│                              │
│       key: mikrotik          │
│       lastSeen: timestamp    │
└──────────────┬───────────────┘
               │
               │ GET /api/status
               ▼
┌──────────────────────────────┐
│          PWA / Web           │
│                              │
│       ONLINE / OFFLINE       │
└──────────────────────────────┘
```

### Принцип работы

1. Роутер MikroTik запускает RouterOS Scheduler.
    
2. Каждые 30 секунд выполняется HTTPS POST на Worker.
    
3. Worker проверяет `Authorization: Bearer ...`.
    
4. При успешной авторизации записывается текущее время в KV.
    
5. Веб-интерфейс каждые 5 секунд запрашивает `/api/status`.
    
6. Worker возвращает время последнего heartbeat.
    
7. Если последний heartbeat был менее 90 секунд назад — роутер считается `ONLINE`.
    
8. Если heartbeat отсутствует более 90 секунд — роутер считается `OFFLINE`.
    

---

# Структура проекта

```text
mikrotik-monitor/
│
├── src/
│   └── index.ts
│
├── public/
│   ├── index.html
│   ├── style.css
│   ├── app.js
│   ├── manifest.webmanifest
│   ├── sw.js
│   │
│   └── icons/
│       ├── icon-192.png
│       └── icon-512.png
│
├── .gitignore
├── README.md
├── package.json
├── package-lock.json
├── tsconfig.json
└── wrangler.jsonc
```

### `src/index.ts`

Бэкенд Cloudflare Worker.

Обрабатывает:

```text
POST /api/heartbeat
GET  /api/status
```

### `public/index.html`

Основная HTML-разметка интерфейса.

### `public/style.css`

Стили веб-интерфейса.

### `public/app.js`

Frontend-логика:

- получение статуса;
    
- обновление интерфейса;
    
- счётчик возраста(age) heartbeat;
    
- отображение последней проверки;
    
- регистрация Service Worker.
    

### `public/manifest.webmanifest`

PWA Manifest.

Позволяет устанавливать монитор как приложение на поддерживаемых устройствах.

### `public/sw.js`

Service Worker.

Используется для кэширования статических файлов интерфейса и работы PWA.

### `wrangler.jsonc`

Конфигурация Cloudflare Workers и KV.

---

# Безопасность

Heartbeat защищён секретным токеном.

Worker ожидает HTTP-заголовок:

```text
Authorization: Bearer YOUR_TOKEN
```

Сам токен **не хранится в исходном коде проекта**.

Для Cloudflare Workers используется Secret:

```text
HEARTBEAT_TOKEN
```
    

---

# Требования

Для установки проекта понадобятся:

- Node.js
    
- npm
    
- аккаунт Cloudflare
    
- Cloudflare Workers
    
- Cloudflare KV
    
- Роутер MikroTik с RouterOS 7
    

Для проверки версии Node.js:

```bash
node --version
```

Проверка npm:

```bash
npm --version
```

Проверка Wrangler:

```bash
npx wrangler --version
```

---

# Установка

## 1. Клонирование репозитория

```bash
git clone https://github.com/fsdevcom2000/mikrotik-monitor.git
cd mikrotik-monitor
```

---

## 2. Установка зависимостей

```bash
npm install
```

---

# Создание KV Namespace

Создайте KV namespace:

```bash
npx wrangler kv namespace create ROUTER_STATUS
```

Wrangler выведет примерно:

```text
id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

Полученный ID необходимо указать в `wrangler.jsonc`.

Пример:

```json
{
	"name": "mikrotik-monitor",
	"main": "src/index.ts",
	"compatibility_date": "2026-09-03",

	"kv_namespaces": [
		{
			"binding": "ROUTER_STATUS",
			"id": "YOUR_KV_NAMESPACE_ID"
		}
	],

	"assets": {
		"directory": "./public"
	}
}
```

---

# Создание секретного токена

Создайте секрет Cloudflare:

```bash
npx wrangler secret put HEARTBEAT_TOKEN
```

Wrangler попросит ввести значение.

Придумайте длинный случайный токен.

Например:

```text
a-long-random-secret-token
```

Проверить список секретов:

```bash
npx wrangler secret list
```

---

# Локальный запуск

Для запуска Worker локально:

```bash
npm run dev
```

После запуска Wrangler покажет локальный адрес, например:

```text
http://localhost:8787
```

---

# API

#### GET `/api/status`

Возвращает текущий статус роутера MikroTik.

Пример:

```json
{
	"online": true,
	"lastSeen": 1788378429236,
	"age": 37699
}
```

### Поля

| Поле       | Описание                            |
| ---------- | ----------------------------------- |
| `online`   | Находится ли роутер онлайн          |
| `lastSeen` | Unix timestamp последнего heartbeat |
| `age`      | heartbeat в миллисекундах           |

Если heartbeat ещё никогда не отправлялся:

```json
{
	"online": false,
	"lastSeen": null,
	"age": null
}
```

---

#### POST `/api/heartbeat`

Используется роутер MikroTik для отправки heartbeat.

Необходим заголовок:

```text
Authorization: Bearer YOUR_TOKEN
```

Пример запроса:

```http
POST /api/heartbeat
Authorization: Bearer YOUR_TOKEN
```

При успешном запросе Worker возвращает:

```json
{
	"ok": true,
	"lastSeen": 1788378429236
}
```

При неправильном токене:

```text
401 Unauthorized
```

---

# Настройка роутера MikroTik

На роутере MikroTik необходимо создать в планировщике задачу, которая будет запускать скрипт.

Пример скрипта:

```routeros
:local url "https://YOUR-WORKER.workers.dev/api/heartbeat"

    :local token "YOUR_TOKEN"

  

    :do {

        /tool fetch url=$url http-method=post http-data="" http-header-field=("Authorization: Bearer " . $token) output=none

  

        :log info "RouterCheck: heartbeat sent"

    } on-error={

        :log warning "RouterCheck: heartbeat failed"

    }
```


---

## Ручная проверка heartbeat

Для тестирования:

```routeros
/tool fetch url="https://YOUR-WORKER.workers.dev/api/heartbeat" http-method=post http-data="" http-header-field="Authorization: Bearer YOUR_TOKEN" output=user
```

При успешном запросе Worker должен вернуть JSON с `ok: true`.

После этого можно проверить статус:

```routeros
/tool fetch url="https://YOUR-WORKER.workers.dev/api/status" output=user
```

Ожидаемый результат:

```json
{
	"online": true,
	"lastSeen": 1788378429236,
	"age": 1234
}
```

---

# Таймаут

В Worker используется:

```typescript
const OFFLINE_TIMEOUT = 90_000;
```

Это означает:

```text
90 000 ms = 90 секунд
```

При heartbeat каждые 30 секунд система допускает пропуск одного или нескольких запросов.

Логика:

```text
Heartbeat каждые 30 сек
        │
        ├── < 90 сек → ONLINE
        │
        └── >= 90 сек → OFFLINE
```

При необходимости значение можно изменить в:

```text
src/index.ts
```

Например:

```typescript
const OFFLINE_TIMEOUT = 120_000;
```

для таймаута 120 секунд.

---

# PWA

Проект поддерживает Progressive Web App.

После открытия сайта на мобильном устройстве его можно установить на главный экран.

PWA состоит из:

```text
manifest.webmanifest
sw.js
icons/
```

Manifest содержит:

- название приложения;
    
- короткое название;
    
- иконки;
    
- цвет интерфейса;
    
- режим `standalone`;
    
- ориентацию приложения.
    

---

# Service Worker

Service Worker кэширует статические файлы интерфейса:

```text
/
index.html
style.css
app.js
manifest.webmanifest
```

API-запросы:

```text
/api/*
```

**не кэшируются**.

Статические файлы сначала пытаются загрузиться из сети, а при отсутствии сети используется кэш.

Это позволяет открыть интерфейс даже при временной потере соединения.

---

# Деплой

Для публикации Worker:

```bash
npm run deploy
```

или:

```bash
npx wrangler deploy
```

После успешного деплоя Wrangler покажет URL Worker.

Например:

```text
https://YOUR-WORKER.workers.dev
```

Этот адрес необходимо использовать в скрипте для роутера MikroTik.

---

# Разработка

Проверка TypeScript:

```bash
npx tsc --noEmit
```

Локальный запуск:

```bash
npm run dev
```

Deployment:

```bash
npm run deploy
```

---

# Обновление проекта

После изменения фронтенд-файлов:

```text
public/index.html
public/style.css
public/app.js
public/manifest.webmanifest
public/sw.js
```

необходимо выполнить:

```bash
npm run deploy
```

Service Worker использует версию кэша:

```javascript
const CACHE_NAME = "mikrotik-monitor-v1";
```

При значительных изменениях интерфейса рекомендуется увеличить версию:

```javascript
const CACHE_NAME = "mikrotik-monitor-v2";
```

Это заставит Service Worker создать новый кэш.

---

# Интервалы

По умолчанию используются следующие значения:

| Параметр           | Значение |
| ------------------ | -------: |
| Heartbeat MikroTik |   30 сек |
| Проверка фронтенд  |    5 сек |
| Локальный счётчик  |    1 сек |
| Offline таймаут    |   90 сек |

Heartbeat:

```text
MikroTik → Worker
каждые 30 секунд
```

Проверка:

```text
Browser → Worker
каждые 5 секунд
```

---

# Почему не нужно открывать порты роутера из интернета

Проект работает по принципу **outbound heartbeat**.

Роутер MikroTik сам устанавливает HTTPS-соединение:

```text
MikroTik
   │
   │ HTTPS OUT
   ▼
Cloudflare Worker
```

Worker не устанавливает соединение обратно с роутером.

Поэтому для работы проекта не требуется:

- проброс портов;
    
- белый IP;
    
- VPN;
    
- открытый HTTP/HTTPS порт на роутере MikroTik;
    
- входящее соединение к роутеру.
    

Это особенно удобно для подключений за NAT/CGNAT.

---

# Технологии

Проект использует:

- **Cloudflare Workers**
    
- **Cloudflare KV**
    
- **TypeScript**
    
- **JavaScript**
    
- **HTML5**
    
- **CSS3**
    
- **PWA**
    
- **Service Worker**
    
- **MikroTik RouterOS**
    
- **Wrangler**
    
- **Node.js / npm**
    

---

# Идея проекта

MikroTik Monitor предназначен для простой и независимой проверки доступности роутера  MikroTik без необходимости разворачивать отдельный VPS, базу данных или backend.

Вся инфраструктура мониторинга может работать на Cloudflare:

```text
MikroTik router
    ↓
HTTPS
    ↓
Cloudflare Worker
    ↓
Cloudflare KV
    ↓
PWA
```

Минимальная инфраструктура, отсутствие входящих соединений и возможность установки интерфейса как мобильного приложения.

---
# Лицензия

Этот проект распространяется под лицензией MIT. Подробные условия лицензии приведены в файле [LICENSE](LICENSE).
