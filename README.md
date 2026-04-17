# DocScheduler

ระบบจัดตารางเวรแพทย์ประจำเดือน — PWA ใช้งานได้ออฟไลน์ ไม่มีค่าใช้จ่าย

## Tech Stack

- React 18 + TypeScript
- Vite 5 + vite-plugin-pwa
- Tailwind CSS + shadcn/ui
- FullCalendar
- **localStorage** (ไม่ต้องมี database หรือ backend)

## เริ่มต้นใช้งาน

```bash
npm install
npm run dev
```

เปิดเบราว์เซอร์ที่ http://localhost:8080

## Build สำหรับ Production

```bash
npm run build
npm run preview
```

## ติดตั้งเป็น PWA (Add to Home Screen)

หลัง deploy แล้ว ให้เปิดเว็บบนมือถือ แล้วกด **"Add to Home Screen"** ได้เลย
- iOS: Safari → Share → Add to Home Screen
- Android: Chrome → Menu → Add to Home Screen

## ข้อมูล

ข้อมูลทั้งหมดเก็บใน `localStorage` ของเบราว์เซอร์ ไม่มี server ไม่มี database
ใช้งานได้ออฟไลน์หลังจาก load ครั้งแรกแล้ว

## Deploy ฟรี

- [Vercel](https://vercel.com) — `vercel deploy`
- [Netlify](https://netlify.com) — drag & drop โฟลเดอร์ `dist/`
- [GitHub Pages](https://pages.github.com)
