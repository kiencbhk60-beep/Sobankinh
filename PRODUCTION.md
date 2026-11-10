# Sổ bán kính chính thức

Site riêng, giữ quyền chỉ chủ sở hữu trong Sites. API dùng kho chung được bảo vệ bởi cổng truy cập Sites; không đổi thành public khi chưa bổ sung phân quyền ghi.

Dữ liệu nghiệp vụ lưu ở D1, bảng stores, khóa official-store-v1. GET khởi tạo một lần bằng INSERT OR IGNORE; các lần triển khai sau không ghi đè dữ liệu. POST kiểm tra nghiệp vụ phía máy chủ và cập nhật có điều kiện theo revision. Không có API reset dữ liệu.

Tồn đầu: file danh sách hàng.xlsx người dùng gửi 10/11/2026, sheet Inventory, dòng 8–18. SKU=cột A, tên=cột D (K-11 thiếu tên), giá vốn=cột F Unit cost, tồn=cột G On hand, ngưỡng=cột H. 11 mã, 16 chiếc, 1.041.398 VND. Last counted không phải ngày nhập; lô tồn đầu có ngày nội bộ 0000-00-00 và được xuất trước lô mới. Không nhập dữ liệu đơn hàng từ các sheet khác. Giá bán, tồn order và 5 vật tư đóng gói bắt đầu 0 vì Inventory không cung cấp.

Schema: drizzle/0000_spotty_agent_brand.sql. Không sửa migration đã áp dụng. Seed app/seed.json chỉ dành cho kho chưa khởi tạo. Nút Sao lưu dữ liệu xuất toàn bộ trạng thái đang tải thành JSON.

Kiểm tra: node tests/server-store.mjs; các bài FIFO, order-stock, packaging, reporting; tsc --noEmit. Không tạo đơn QA trên kho production.
