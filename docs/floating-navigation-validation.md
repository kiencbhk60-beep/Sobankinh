# Menu mascot Bross

Menu vòng cung dùng chung trên điện thoại, tablet và desktop; sidebar được ẩn. Giữ năm mục và callback điều hướng, số đơn đang xử lý, trạng thái chọn từ SalesApp. Không sửa dữ liệu, API hoặc xử lý đơn hàng.

Nhấn mascot mở menu; kéo từ 5px trở lên chỉ di chuyển, không mở menu. Lưu vị trí tương đối trong localStorage, giới hạn trong màn hình. Menu đổi hướng và dùng thêm tầng cung nếu cần. Mascot tránh các ô nhập và nút thao tác quan trọng khi thả/cuộn. Khi mở biểu mẫu, ẩn mascot. Escape, dấu X hoặc nhấn ngoài đóng menu; focus trả về nút mở. Phím mũi tên di chuyển, Shift tăng bước, Home đặt lại.

Engine Bloub giữ nguyên hằng số gốc; giấy phép và revision trong lib/bloub. Biểu cảm theo lựa chọn chủ cửa hàng được khai báo riêng trong lib/mascot-reactions.ts và điều phối ở app/use-mascot-reactions.ts.

## Kiểm tra

- TypeScript và production build đạt.
- tests/floating-navigation.mjs: 729 vị trí trên lưới 9×9, điện thoại, tablet, desktop và ngang; nút và nhãn không chồng nhau, không vượt màn hình; lưu vị trí và tránh nút thao tác. Kiểm tra tối đa hai bán kính và góc cách đều trên mỗi cung, tính cả viền chọn/focus và huy hiệu thông báo.
- tests/mobile-radial-navigation.mjs: năm mục, huy hiệu số đơn bằng đầu vào thực, active state và ẩn khi có modal.
- Orca browser: 320/375/390/430/768/1440px, đủ năm nút/nhãn trong màn hình, không cuộn ngang. Kiểm tra nền sáng/tối, giảm chuyển động, Enter mở/chọn trang, Escape đóng, trả focus.
- Kéo bằng chuột từ (537,508) đến (300,300): vị trí mới (268,268), lưu localStorage; menu vẫn đóng. Nhấn tiếp mở menu, dùng Enter chọn Đơn hàng thành công.
- Máy chủ dữ liệu local không kết nối; không kiểm tra ghi đơn thật hoặc số đơn từ máy chủ. Không tạo dữ liệu thử trên hệ thống bán hàng.

## Sửa bố cục cung tròn

Thuật toán chọn từng chỗ trống trước đây tạo các bán kính tùy ý, khiến menu phân tán dù không chồng hình chữ nhật kiểm thử. Thay bằng kiểm tra nguyên bộ cung có bước góc đều; ưu tiên nhãn cùng phía, dùng hai tầng đồng tâm nếu một tầng không vừa. Dành khoảng trống 8px giữa vùng bao gồm cả viền/huy hiệu. Trên màn hình quá thấp, tâm menu mở tạm dịch đến vị trí an toàn gần nhất; vị trí kéo đã lưu không thay đổi. Không ném lỗi render nếu màn hình co rất nhỏ.

## Mã tương tác

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

## Biểu cảm đã gắn

| Mã | Hiệu ứng |
|---|---|
| 01 | Notification một lần trong mỗi phiên trình duyệt |
| 02 | Orbit giữ suốt lúc menu mở; tiếp tục một chu kỳ khi đóng |
| 03 | Wide eyes khi kéo và sau khi thả |
| 04–05 | Giữ trung tính, chưa chọn hiệu ứng riêng |
| 06 | Thinking khi tìm kính, kể cả không có kết quả |
| 07 | Happy khi thêm kính thành công vào giỏ |
| 08 | Neutral khi tăng/giảm số lượng, xóa dòng giỏ |
| 09 | Curious khi đổi vật tư đóng gói |
| 10 | Attentive khi nhập thông tin, Alert khi form không hợp lệ |
| 11 | Thinking đến khi có kết quả; Happy thành công, Alert lỗi |
| 12 | Exclamation khi không đủ tồn |
| 13 | Attentive khi tìm/lọc/xem đơn |
| 14 | Wink sau xác nhận thành công |
| 15 | Chờ giao/nhận hàng: Happy; đang giao: Comet; đã giao: Proud; hủy: Sad; hoàn: Attentive |
| 16 | Happy sau khi lưu số tiền đã thu thành công |
| 17–18 | Mở nhập hàng: Curious, mở sửa sản phẩm: Attentive; lưu thành công: Happy, lỗi: Alert |
| 19 | Thinking khi làm mới, Notification nếu phát hiện ID đơn mới sau phản hồi máy chủ |
| 20 | Thinking đang kết nối, Wink kết nối được, Alert mất kết nối |
| 21 | Wink khi chuyển sáng/tối |
| 22 | Proud khi xuất/sao lưu tệp |
| 23 | Comet khi mở shop |
| 24 | Sleep sau 60 giây không thao tác, Notification khi thao tác lại hoặc quay lại tab |

Orbit trong menu được ưu tiên hơn mọi phản ứng nghiệp vụ. Sự kiện kết nối thụ động không che mất thông báo lỗi/thành công. Trong biểu mẫu, mascot nhỏ nằm ở tiêu đề, không cản nút lưu hoặc nhập liệu. Giảm chuyển động: vẽ khung tĩnh của hiệu ứng được chọn; không chạy requestAnimationFrame. Khi ẩn tab thì tạm dừng animation. Dọn timer và listener khi unmount.

Các trạng thái thành công chỉ được kích hoạt sau phản hồi thật của hệ thống. Không thêm polling, dữ liệu mẫu mới hoặc thay đổi API/quy tắc nghiệp vụ. tests/mascot-reactions.mjs kiểm tra các lựa chọn, vòng Orbit/hạt Notification/Thinking, phân loại kết quả lưu, ưu tiên, thử lại sau lỗi, timeout về trung tính, ngủ/thức và dọn tài nguyên.
