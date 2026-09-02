# Prompt xây dựng (bản 3): "React Explorer" — chia theo chương, giữ nguyên văn, flow ở chỗ khó

So với bản 2 (một trang cuộn dài duy nhất), bản này **chia tài liệu thành từng chương riêng** (mỗi chương = 1 mục lớn của file gốc), có điều hướng "chương trước / chương sau" và sidebar liệt kê tất cả chương — giống đọc một cuốn sách kỹ thuật hoặc docs site (kiểu docs.react.dev), thay vì cuộn một trang dài vô tận. Bên trong mỗi chương vẫn giữ nguyên 100% văn bản gốc của mục đó, chỉ chèn flow diagram ở đúng chỗ có code khó hoặc khái niệm trừu tượng.

---

## PROMPT (copy toàn bộ phần trong khung này)

```
Xây một trang web dạng sách/docs đọc theo chương (giống docs.react.dev), tên
"React Explorer", dựa trên toàn bộ nội dung file React-base-nang-cao.md tôi đính kèm.

CHIA CHƯƠNG
- Mỗi heading cấp 2 (##) trong file gốc là một CHƯƠNG riêng, có URL/route hoặc
  trạng thái điều hướng riêng (dùng hash routing kiểu #chuong-1 là đủ, không cần
  backend). Giữ đúng số thứ tự và tên chương như file gốc, không đổi tên, không
  gộp/tách chương khác với cấu trúc gốc.
- Mỗi lần chỉ hiển thị NỘI DUNG CỦA MỘT CHƯƠNG trên màn hình (không hiện tất cả
  chương cùng lúc, không cuộn dài vô tận qua nhiều chương) — người đọc chuyển
  chương bằng sidebar hoặc nút "Chương tiếp theo →" / "← Chương trước" ở cuối
  mỗi chương.
- Sidebar bên trái liệt kê TẤT CẢ chương theo đúng thứ tự, chương đang đọc được
  đánh dấu active, chương đã đọc xong (đã cuộn hết) có thể đánh dấu tích nhẹ để
  người đọc biết mình đang ở đâu trong toàn bộ tài liệu.
- Trong nội bộ một chương dài (ví dụ chương có nhiều heading con ### bên trong),
  vẫn hiển thị đầy đủ các mục con đó tuần tự trong cùng 1 trang chương — KHÔNG
  cần chia nhỏ tới cấp heading 3, chỉ chia theo heading 2.

GIỮ NGUYÊN NỘI DUNG — không đổi so với bản gốc
- Mỗi chương phải chứa ĐẦY ĐỦ văn bản giải thích và mọi đoạn code của đúng mục đó
  trong file gốc — không tóm tắt, không diễn giải lại, không cắt bớt, không bịa
  thêm nội dung ngoài tài liệu. Copy nguyên văn, chỉ chuyển định dạng markdown
  sang HTML (bảng, code block, blockquote giữ đúng cấu trúc).
- Trước khi chèn flow diagram, hãy tự đối chiếu lại xem đã đưa đủ 100% đoạn văn/
  code của chương đó vào chưa — thiếu đoạn nào phải bổ sung trước khi làm bước
  tiếp theo.

CHỈ VISUALIZE Ở CODE VÀ KHÁI NIỆM KHÓ (không vẽ tràn lan)
- Với mỗi code block trong chương, tự hỏi: người mới đọc có hình dung ngay được
  trình tự chạy không, hay cần xem "từng bước" mới hiểu? Chỉ loại thứ hai mới cần
  flow diagram kèm theo (ví dụ: diffing 2 cây VDOM, key=index gây bug, reducer
  Redux, useEffect có cleanup). Code minh hoạ đơn giản (ví dụ PHP ghép chuỗi,
  bảng so sánh cú pháp) thì để nguyên, không cần vẽ thêm.
- Với đoạn văn (không code) mô tả một cơ chế nhiều bước mà tài liệu tự gọi là
  "cơ chế", "quá trình", "N giai đoạn", "heuristic", "Reconciliation", "one-way
  data flow" — thêm 1 flow diagram tóm tắt đúng các bước đã liệt kê trong văn
  bản, không thêm bước nào ngoài tài liệu.
- Danh sách flow tối thiểu bắt buộc theo đúng nội dung file (đối chiếu lại với
  file thật, có thể có thêm phần tương tự không liệt kê ở đây thì áp dụng cùng
  nguyên tắc):
  - Chương "bối cảnh ra đời": flow so sánh "vẽ lại toàn bộ danh sách" và "chỉ vá
    đúng phần đổi".
  - Chương "triết lý thiết kế", mục one-way data flow: flow callback đi lên
    Parent, props đi xuống Child.
  - Chương về JSX: flow "JSX → object JS" dùng đúng ví dụ trong tài liệu.
  - Chương Virtual DOM: flow 4 giai đoạn Reconciliation (First Paint → Trigger
    → Diffing → Commit); flow minh hoạ đúng ví dụ xoá A khỏi [A,B,C] với
    key=index vs key=id; timeline so sánh Stack Reconciler (khối liền) vs
    Fiber (chia nhỏ, ngắt được).
  - Chương Hooks: flow đối chiếu componentDidMount/WillUnmount (Class) với
    useEffect + cleanup (Hook), xếp song song.
  - Chương Redux (nếu có createSlice/dispatch): flow dispatch → reducer →
    store update → UI đọc lại qua useSelector.

CÁCH HIỂN THỊ MỘT "FLOW BLOCK"
- Đặt ngay dưới đoạn văn/code liên quan trong chương đó, có viền/nền phân biệt
  rõ với phần văn bản đọc.
- Có nút "Chạy" hoặc thanh bước (1/2/3...) để người đọc tự bấm qua từng bước,
  không tự chạy liên tục gây phân tâm.
- Dùng đúng thuật ngữ tài liệu đã dùng, không đổi từ.
- Nếu flow có input lấy từ đoạn code ngay phía trên (ví dụ danh sách item, giá
  trị count), cho phép người đọc chỉnh input đó rồi chạy lại flow.

ĐIỀU HƯỚNG & TIẾN ĐỘ
- Thanh tiến độ tổng ở đầu trang: "Chương X / N".
- Cuối mỗi chương có 2 nút: "← Chương trước" và "Chương tiếp theo →" (ẩn nút
  tương ứng ở chương đầu/cuối).
- Phím tắt tuỳ chọn: phím mũi tên trái/phải để chuyển chương (không bắt buộc,
  làm nếu còn thời gian).

STACK KỸ THUẬT
- HTML/CSS/JS thuần, một file duy nhất, không cần build step, mở lên chạy được
  ngay. Nội dung markdown gốc convert sang HTML ngay trong file JS (có thể để
  dạng object { chuong1: {title, htmlContent}, ... } hoặc render trực tiếp).
- Code block dùng font mono, có thể thêm highlight.js qua CDN cho dễ đọc.
- Flow diagram dùng SVG + CSS transition/JS thuần; dùng canvas nếu cần animation
  mượt hơn.

YÊU CẦU TRÌNH BÀY
- Line-length vừa phải cho đoạn văn (khoảng 65-75 ký tự/dòng), không kéo full
  màn hình cho phần chữ.
- Dark mode, tương phản tốt để đọc lâu không mỏi mắt.
- Responsive: trên mobile sidebar thu vào nút toggle, flow block co vừa màn
  hình (cho cuộn ngang nếu sơ đồ rộng), nút chuyển chương dễ bấm bằng ngón tay.

RÀNG BUỘC QUAN TRỌNG (nhắc lại vì dễ bị AI làm sai nhất)
- KHÔNG tóm tắt hay diễn giải lại bất kỳ đoạn văn bản gốc nào.
- KHÔNG bỏ sót bất kỳ đoạn code hay ví dụ nào có trong file gốc.
- KHÔNG bịa thêm khái niệm/ví dụ/code ngoài tài liệu khi làm flow diagram.

THỨ TỰ THỰC HIỆN
1. Parse file gốc, tách đúng thành các chương theo heading cấp 2, kiểm tra tổng
   số ký tự nội dung mỗi chương so với file gốc để chắc chắn không thiếu đoạn nào.
2. Dựng khung điều hướng (sidebar + nút chương trước/sau + progress "Chương X/N").
3. Đổ đầy nội dung từng chương (chỉ convert định dạng, không sửa chữ).
4. Chèn flow diagram vào đúng các vị trí đã liệt kê, ưu tiên làm chương Virtual
   DOM/Fiber trước vì đây là phần trừu tượng nhất.
```

---

## Khác gì so với bản 2 (một trang cuộn dài)

| Tiêu chí | Bản 2 | Bản 3 (bản này) |
|---|---|---|
| Cách xem nội dung | Cuộn 1 trang dài từ đầu đến cuối | Mỗi lần 1 chương, chuyển qua nút/sidebar |
| Điều hướng | Mục lục bám scroll | Sidebar chương + nút "chương trước/sau" + "Chương X/N" |
| Cảm giác đọc | Giống 1 bài blog dài | Giống đọc sách/docs theo mục |
| Nội dung gốc | Giữ nguyên toàn văn | Giữ nguyên toàn văn (không đổi) |
| Vị trí chèn flow | Chỉ ở code/khái niệm khó | Giữ nguyên nguyên tắc, chỉ khác chỗ chứa (theo từng chương) |

## Gợi ý dùng prompt này

- Dùng với Claude Code/Cursor, đính kèm file gốc để AI đối chiếu khi convert — nhắc lại yêu cầu "không tóm tắt" là điểm AI hay làm sai nhất khi nội dung dài.
- Nếu tài liệu gốc có chương quá dài (ví dụ chương Virtual DOM có tới 4 mục con), vẫn để nguyên trong 1 chương theo đúng cấu trúc heading 2 — đừng tách thêm, chỉ cần cuộn trong nội bộ chương đó.

Muốn mình build luôn bản HTML chia chương này ngay trong chat để bạn xem trước không?
