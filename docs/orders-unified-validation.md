# Gộp Đơn hàng và Giao hàng — 18/11/2026

## Before / After

| Trước | Sau |
| --- | --- |
| Đơn hàng và Giao hàng có hai điểm điều hướng, dùng cùng nguồn dữ liệu | Một mục Đơn hàng trên sidebar và menu điện thoại |
| Xác nhận nhanh phụ thuộc trang Giao hàng | Nút Xác nhận ngay trên đơn đang chờ xác nhận |
| Bộ lọc dạng select; danh sách giao hàng chỉ gồm trạng thái đang xử lý | Tám pill có số lượng thực tế; mặc định Tất cả, gồm cả đã giao/hủy/hoàn |
| Bảng chung trên mọi thiết bị | Bảng tám cột trên desktop; thẻ đơn trên tablet/mobile |
| Chức năng quản lý phân tán | Tìm kiếm, xác nhận, chi tiết, vận đơn, tiền thu và CSV trong một trang |

Trang mới dùng `state.orders`; tìm theo mã đơn, tên khách không dấu, điện thoại và mã vận đơn. Tìm kiếm kết hợp trạng thái và được giữ khi xác nhận hoặc lưu modal. Tạo đơn mới mở chức năng Bán hàng hiện có. CSV tiếp tục xuất toàn bộ đơn, kể cả khi đang lọc.

## Phạm vi mã nguồn

- `app/sales-app.tsx`: điều hướng Đơn hàng, bộ đếm đang xử lý, tiêu đề, liên kết tạo đơn và tích hợp OrdersPanel. Giữ modal, hàm CSV và form Bán hàng hiện có.
- `app/orders-panel.tsx`: bộ đếm, pill trạng thái, tìm kiếm, bảng/thẻ, nút xác nhận và chi tiết.
- `app/orders-panel.css`: giao diện responsive; màu xanh ngọc giới hạn trong trang Đơn hàng, focus bàn phím, thanh trạng thái cuộn riêng và giảm chuyển động theo tùy chọn hệ thống.
- `app/mobile-radial-navigation.tsx`, `tests/mobile-radial-navigation.mjs`: một điểm Đơn hàng, không còn Giao hàng/Xác nhận đơn hàng riêng; dùng bộ đếm chung. Bản bàn giao kế thừa menu năm mục và chỉnh màu navigation đã có trong commit đồng thời `5c4591d`.
- `tests/orders-panel.mjs`: trạng thái, đếm số đơn, tìm kiếm kết hợp, đơn hoàn/hủy, khóa xác nhận khi chưa sẵn sàng và dữ liệu đầu vào bất biến.
- `tests/order-stock.mjs`: bổ sung vòng đời đơn web order, nhận hàng, giao, hoàn và chống trừ tồn hai lần.
- `tests/server-store.mjs`: bổ sung lưu/đọc lại vận đơn, tiền thu, ghi chú; sửa đơn đã giao không trừ tồn lại.

Không thay đổi `domain.ts`, `store-service.ts`, API, cấu trúc Order/State, seed, migration, FIFO, giá vốn, doanh thu/lợi nhuận, Dashboard, Kho hàng hoặc form nhập hàng. Không chạy thao tác reset/migration/ghi dữ liệu lên D1 production.

## Kiểm tra tự động

Đã chạy thành công trên mã đã đồng bộ với `5c4591d`:

- `tsc --noEmit`.
- `npm run build` — exit 0, hoàn thành đủ năm bước Vinext. Máy ít bộ nhớ nên chạy với `RAYON_NUM_THREADS=1` và `NODE_OPTIONS=--max-old-space-size=768`; không đổi cấu hình dự án.
- Tất cả tám file test: `cincacao-sync`, `fifo`, `mobile-radial-navigation`, `order-stock`, `orders-panel`, `packaging`, `reporting`, `server-store`.
- `git diff --check`.

Các test xác nhận: đơn web và đơn Bán hàng dùng cùng dữ liệu; đơn thiếu hàng không được giao; nhận đủ hàng tự sang Chờ giao; Chờ giao → Đang giao → Đã giao chỉ trừ tồn một lần; hủy giải phóng giữ hàng; hoàn nhập lại tồn theo logic cũ; FIFO/vật tư/lợi nhuận giữ nguyên; dữ liệu cập nhật được đọc lại từ SQLite qua store-service. Test tích hợp storefront cần repo Trekbross ở thư mục liền kề; môi trường kiểm thử dùng junction local, không sửa đường dẫn test.

Build vẫn có cảnh báo sẵn có của Vinext về tối ưu barrel icon và phân loại route, cùng Node deprecation; không có lỗi build.

## Kiểm tra trình duyệt

Chạy bản build qua Wrangler local tại `127.0.0.1:5174`, kiểm tra bằng Orca browser. Dùng fixture tám đơn thuộc bảy trạng thái và chặn `/api/store` trong tab local; không thao tác dữ liệu kinh doanh thật. Nghiệp vụ và lưu dữ liệu được kiểm riêng bằng test domain/API/store-service thực tế ở trên; fixture UI không được dùng để chứng minh tồn kho hoặc persistence.

Đã thao tác và xác nhận:

- Tìm tên không dấu + trạng thái; tìm điện thoại và vận đơn.
- Xác nhận nhanh đơn đủ hàng → Chờ giao; đơn có order → Chờ hàng về.
- Giữ từ khóa/trạng thái sau xác nhận; giữ từ khóa sau lưu modal.
- Modal cũ hiển thị khách, sản phẩm, giá vốn và cost đóng gói; lưu vận đơn, tiền thu và ghi chú qua callback update hiện có.
- CSV vẫn chứa cả tám đơn khi từ khóa đang giới hạn danh sách.
- Nút Tạo đơn mới mở form Bán hàng hiện có; trở lại Đơn hàng mặc định Tất cả.
- Escape đóng menu điện thoại và trả focus về nút mở menu.

| Viewport | Hiển thị | Tràn ngang toàn trang |
| --- | --- | --- |
| 1440 × 1000 | Bảng desktop | Không |
| 1024 × 768 | Bảng desktop | Không |
| 768 × 900 | Thẻ hai cột | Không |
| 390 × 844 | Thẻ một cột | Không |
| 375 × 812 | Thẻ một cột | Không |

Thanh pill có thể cuộn ngang riêng. Nút CSV và tạo đơn hiện trên điện thoại. Menu giữ cơ chế mở/đóng/focus hiện có. Kiểm tra kích thước và thao tác UI là local; chưa dùng báo cáo này để khẳng định phiên bản production đã được triển khai.
