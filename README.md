# 👨‍🏫 Classroom Observer

ระบบสังเกตการณ์และวิเคราะห์การมีส่วนร่วมในชั้นเรียน (Classroom Observer) โดยใช้เทคโนโลยีตรวจจับใบหน้าและจำแนกอารมณ์แบบเรียลไทม์ พัฒนาด้วย Next.js และ Firebase พร้อมแดชบอร์ดสรุปผลและแสดงข้อมูลย้อนหลัง

---

## 🚀 คุณสมบัติ (Features)

✅ **ระบบยืนยันตัวตน:** ล็อกอินและลงทะเบียนผู้ใช้งาน (User & Admin) อย่างปลอดภัยด้วย Firebase Authentication
✅ **การวิเคราะห์วิดีโอสด:** ตรวจจับใบหน้าและแสดงผลสถานะ "สนใจ" (สีเขียว) หรือ "ไม่สนใจ" (สีแดง) บนวิดีโอแบบเรียลไทม์
✅ **ข้อมูลสรุปเรียลไทม์:** แดชบอร์ดแสดงผลจำนวนนักเรียนทั้งหมด และเปอร์เซ็นต์ความสนใจ ณ ปัจจุบัน
✅ **บันทึกข้อมูลย้อนหลัง:** ระบบจะบันทึกค่าเฉลี่ยการมีส่วนร่วมทุกๆ 1 นาที เพื่อดูแนวโน้มย้อนหลังได้
✅ **กราฟแสดงแนวโน้ม:** กราฟเส้นแสดงแนวโน้มจำนวนผู้ที่สนใจและไม่สนใจตลอดช่วงเวลาการสังเกตการณ์
✅ **ส่งออกข้อมูล:** สามารถส่งออก (Export) ข้อมูลสรุปและข้อมูลย้อนหลังเป็นไฟล์ Excel (.csv) ได้
✅ **แดชบอร์ดผู้ดูแลระบบ:** ผู้ดูแลระบบ (Admin) สามารถดูประวัติการสังเกตการณ์ทั้งหมดที่เกิดขึ้นในระบบได้
✅ **ประวัติส่วนตัว:** ผู้ใช้งานทั่วไปสามารถดูประวัติการสังเกตการณ์ของตนเองได้
✅ **รองรับ Dark / Light Theme:** สามารถปรับเปลี่ยนธีมสีของแอปพลิเคชันได้
✅ **Responsive:** รองรับการใช้งานทั้งบนคอมพิวเตอร์และแท็บเล็ต

---

## 🛠️ เทคโนโลยีที่ใช้ (Tech Stack)

-   **Frontend:** Next.js 14 + React + TypeScript + TailwindCSS + ShadCN UI
-   **Backend & Database:** Firebase (Authentication, Firestore)
-   **AI / Machine Learning:** MediaPipe (Face Detection), TensorFlow.js (Emotion Classification)
-   **Charts:** Recharts
-   **Deployment:** Firebase App Hosting

---

## 📦 การติดตั้ง (Installation)

1.  **Clone โปรเจกต์**
    ```bash
    git clone [URL ของ Git Repository ของคุณ]
    cd [ชื่อโฟลเดอร์โปรเจกต์]
    ```

2.  **ติดตั้ง Dependencies**
    ```bash
    npm install
    # หรือ
    yarn install
    ```

3.  **ตั้งค่า Environment Variables**
    สร้างไฟล์ `.env.local` ที่ Root ของโปรเจกต์ และใส่ค่า Firebase Configuration ของคุณ:
    ```
    NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
    NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
    ```

4.  **รันโปรเจกต์**
    ```bash
    npm run dev
    # หรือ
    yarn dev
    ```
    เปิดเบราว์เซอร์ไปที่ [http://localhost:9002](http://localhost:9002)

---

## 👨‍💻 ผู้พัฒนา

-   **ชื่อผู้พัฒนา:** มูฮัมหมัดคอยรี เต๊ะมาลอ
-   **คณะ:** วิศวกรรมศาสตร์
-   **สาขา:** วิศวกรรมคอมพิวเตอร์
-   **📧 Email:** khayreetehmalo@gmail.com
