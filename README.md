# Borian

Street sports platform за управление на 3x3 футболни и баскетболни турнири.

## Технологии

- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui-style компоненти
- Firebase Firestore

## Включени функции

- Начална страница на български
- Административно/операторско табло
- Форма за създаване на турнир
- Форма за създаване на отбор
- Форма за добавяне на играч с ограничение до максимум 4 играчи в отбор
- Генератор на програма всеки срещу всеки
- Запис на генерираната програма във Firebase
- Placeholder публична страница за турнир

## Стартиране локално

```bash
npm install
cp .env.example .env.local
npm run dev
```

Попълни `.env.local` с конфигурацията на твоя Firebase web app.

## Firebase колекции

```txt
tournaments
teams
players
matches
```

## Firestore индекси

Може да са нужни composite indexes за тези заявки:

- matches: tournamentId + startTime
- tournaments: createdAt

Ако липсва индекс, Firebase ще покаже директен линк за създаване в browser console.

## Инсталация на собствен сървър

```bash
npm install
npm run build
npm run start
```

За production можеш да използваш PM2:

```bash
npm install -g pm2
pm2 start npm --name football-3x3 -- start
pm2 save
```

След това сложи Nginx отпред като reverse proxy към порт 3000.

## Tailwind/PostCSS бележка

Този starter използва Tailwind CSS v3, защото включените `tailwind.config.ts` и `@tailwind base/components/utilities` следват класическата shadcn/ui конфигурация. Ако преди това си инсталирал зависимости с `tailwindcss@latest`, изтрий `node_modules` и `package-lock.json`, след което стартирай `npm install` отново.

## Версия с избор по име

В тази версия вече не е нужно да копираш Firestore ID-та в интерфейса.

- При добавяне на отбор избираш турнира от падащо меню по име.
- При добавяне на играч избираш отбора от падащо меню по име.
- При генериране на програма избираш турнира по име и системата автоматично зарежда неговите отбори.

В базата данни все още се пазят `tournamentId` и `teamId`, но потребителят работи с имена, както в нормален admin panel.
