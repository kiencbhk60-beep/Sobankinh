# Sổ bán kính — Bản chính thức

Mã nguồn quản lý bán kính, tồn kho kính và nguyên vật liệu đóng gói, giá vốn FIFO, giao hàng và dashboard doanh thu.

## Đưa lên GitHub

1. Giải nén `So_ban_kinh_GitHub.zip`.
2. Tạo repository **Private** trên GitHub vì `app/seed.json` chứa giá vốn và số tồn kinh doanh.
3. Đưa toàn bộ nội dung thư mục vào repository, gồm cả `.gitignore`, `.npmrc` và `.openai/hosting.json`.
4. Không tải nguyên file ZIP vào repository nếu muốn quản lý/chạy mã nguồn; hãy tải các file đã giải nén.

Hoặc dùng Git trong thư mục đã giải nén (thay URL repository bên dưới):

```bash
git init
git add .
git commit -m "Initial official eyewear sales app"
git branch -M main
git remote add origin https://github.com/TEN_TAI_KHOAN/TEN_REPOSITORY.git
git push -u origin main
```

## Dữ liệu có trong gói

- Tồn đầu theo sheet Inventory: 11 mã kính, 16 chiếc, 1.041.398 VND.
- 5 mã vật tư đóng gói, tồn đầu 0; giá bán gợi ý 0.
- Đơn bán, phiếu nhập mới và lịch sử bán ban đầu trống.
- Ảnh sản phẩm, mã nguồn, khóa phiên bản phụ thuộc, migration cơ sở dữ liệu, bài kiểm tra.
- Không chứa `node_modules`, bản build, Git history, token/mật khẩu, cơ sở dữ liệu đang vận hành hoặc dữ liệu thử của trình duyệt.

Dữ liệu phát sinh trên web hiện tại nằm trong D1 của Sites, **không nằm trong ZIP**. Khi cần chuyển dữ liệu đó, mở web hiện tại và chọn **Sao lưu dữ liệu**. File sao lưu không tự động được nhập vào hệ thống mới.

## Cài và chạy trên máy

Yêu cầu Node.js >= 22.13 và npm.

```bash
npm ci
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_spotty_agent_brand.sql
npm run dev
```

Chỉ chạy migration trên khi cơ sở dữ liệu local chưa có bảng `stores`. Mở URL được lệnh dev in ra (mặc định cổng 5173). Dữ liệu local tách biệt dữ liệu trên web đang chạy.

## Kiểm tra

```bash
npx tsc --noEmit
node tests/fifo.mjs
node tests/order-stock.mjs
node tests/packaging.mjs
node tests/reporting.mjs
node tests/server-store.mjs
```

Bài `server-store.mjs` dùng SQLite tích hợp trong Node.js; nếu phiên bản Node 22 yêu cầu, chạy `node --experimental-sqlite tests/server-store.mjs`.

## Lưu trữ và triển khai

Đây là ứng dụng **React + TypeScript + Vinext**, có API máy chủ và **Cloudflare D1**. GitHub lưu mã nguồn; **GitHub Pages không chạy được nguyên ứng dụng này**.

Bản hiện tại triển khai bằng ChatGPT Sites. `.openai/hosting.json` giữ định danh Site chính thức hiện tại; push vào repository GitHub mới không tự cập nhật Site này. Khi triển khai sang hosting khác, cần cấu hình Worker/D1, áp dụng migration và thiết lập xác thực/phân quyền.

API kho chung dựa vào lớp bảo vệ riêng tư của Sites. Không đưa API ra công khai ở môi trường khác nếu chưa bổ sung xác thực phía máy chủ. Không tin header danh tính do trình duyệt tự gửi.

Xem `PRODUCTION.md` để biết quy tắc tồn đầu và bảo toàn dữ liệu. Seed chỉ khởi tạo khi kho chưa tồn tại; triển khai lại không tự xóa đơn hay ghi đè tồn kho.

## Phiên bản nguồn

Xuất từ commit `a0391cee6f938ed1e3ce40bb5190b3c33fd6774c` của bản chính thức. Chỉ README này được biên soạn riêng cho gói GitHub.
