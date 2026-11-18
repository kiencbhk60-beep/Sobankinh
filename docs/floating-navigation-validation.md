# Menu mascot Bross

Menu vòng cung dùng chung trên điện thoại, tablet và desktop; sidebar được ẩn. Giữ năm mục và callback điều hướng, số đơn đang xử lý, trạng thái chọn từ SalesApp. Không sửa dữ liệu, API hoặc xử lý đơn hàng.

Nhấn mascot mở menu; kéo từ 5px trở lên chỉ di chuyển, không mở menu. Lưu vị trí tương đối trong localStorage, giới hạn trong màn hình. Menu đổi hướng và dùng thêm tầng cung nếu cần. Mascot tránh các ô nhập và nút thao tác quan trọng khi thả/cuộn. Khi mở biểu mẫu, ẩn mascot. Escape, dấu X hoặc nhấn ngoài đóng menu; focus trả về nút mở. Phím mũi tên di chuyển, Shift tăng bước, Home đặt lại.

Engine Bloub giữ nguyên hằng số gốc; giấy phép và revision trong lib/bloub. Hiện chỉ có biểu cảm trung tính, chớp mắt và nhìn theo con trỏ. Chưa gắn biểu cảm với nghiệp vụ, chờ chủ cửa hàng chọn.

## Kiểm tra

- TypeScript và production build đạt.
- tests/floating-navigation.mjs: 81 vị trí ở các góc/trung tâm, điện thoại, tablet, desktop và ngang; nút và nhãn không chồng nhau, không vượt màn hình; lưu vị trí và tránh nút thao tác.
- tests/mobile-radial-navigation.mjs: năm mục, huy hiệu số đơn bằng đầu vào thực, active state và ẩn khi có modal.
- Orca browser: 320/375/390/430/768/1440px, đủ năm nút/nhãn trong màn hình, không cuộn ngang. Kiểm tra nền sáng/tối, giảm chuyển động, Enter mở/chọn trang, Escape đóng, trả focus.
- Kéo bằng chuột từ (537,508) đến (300,300): vị trí mới (268,268), lưu localStorage; menu vẫn đóng. Nhấn tiếp mở menu, dùng Enter chọn Đơn hàng thành công.
- Máy chủ dữ liệu local không kết nối; không kiểm tra ghi đơn thật hoặc số đơn từ máy chủ. Không tạo dữ liệu thử trên hệ thống bán hàng.

## Các tương tác để chọn biểu cảm sau

| Mã | Sự kiện web |
|---|---|
| 01 | Vào ứng dụng lần đầu |
| 02 | Nhấn mascot mở menu / đóng menu |
| 03 | Kéo mascot / thả mascot |
| 04 | Chuyển Dashboard, Bán hàng, Lịch sử nhập, Đơn hàng, Kho hàng |
| 05 | Đổi khoảng ngày hoặc người bán trên Dashboard |
| 06 | Tìm sản phẩm / không có kết quả |
| 07 | Thêm kính vào giỏ |
| 08 | Tăng giảm số lượng / xóa dòng giỏ |
| 09 | Chọn vật tư đóng gói |
| 10 | Nhập thông tin khách / điền thiếu trường bắt buộc |
| 11 | Đang lưu đơn / lưu thành công / lưu thất bại |
| 12 | Thiếu tồn kho khi lưu đơn |
| 13 | Tìm, lọc trạng thái hoặc mở chi tiết đơn |
| 14 | Xác nhận đơn thành công |
| 15 | Cập nhật chờ giao, đang giao, đã giao, hủy hoặc hoàn thành công |
| 16 | Cập nhật số tiền đã thu / thu đủ thành công |
| 17 | Mở phiếu nhập / nhập lô hàng thành công / thất bại |
| 18 | Mở chỉnh sửa sản phẩm / lưu thành công / thất bại |
| 19 | Làm mới dữ liệu / phát hiện thêm đơn sau khi tải lại |
| 20 | Máy chủ đang kết nối / kết nối được / mất kết nối |
| 21 | Chuyển nền sáng hoặc tối |
| 22 | Sao lưu dữ liệu / xuất CSV |
| 23 | Mở shop kính |
| 24 | Không thao tác một khoảng thời gian / quay lại tab |

Các trạng thái thành công chỉ được kích hoạt sau phản hồi thật của hệ thống nếu được chọn để triển khai. Chưa thêm polling hoặc thông báo thời gian thực.
