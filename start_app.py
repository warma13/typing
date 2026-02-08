import http.server
import socketserver
import webbrowser
import os
import threading
import time

# 项目根目录
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# 服务器端口
PORT = 8000

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

def start_server():
    """启动HTTP服务器"""
    with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
        print(f"服务器启动在 http://localhost:{PORT}")
        httpd.serve_forever()

def open_browser():
    """打开浏览器"""
    time.sleep(1)  # 等待服务器启动
    url = f"http://localhost:{PORT}"
    print(f"正在打开浏览器: {url}")
    webbrowser.open(url)

def main():
    """主函数"""
    print("正在启动打字练习应用...")
    
    # 在后台线程中启动服务器
    server_thread = threading.Thread(target=start_server, daemon=True)
    server_thread.start()
    
    # 打开浏览器
    open_browser()
    
    # 保持主线程运行
    print("应用已启动，按 Ctrl+C 退出")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("正在关闭应用...")

if __name__ == "__main__":
    main()