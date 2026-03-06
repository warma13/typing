import os
import re

# 定义需要排除的目录
excluded_dirs = ['心理学', '网文']

# 定义练习文章的根目录
root_dir = '练习文章'

# 替换函数
def replace_quotes_in_file(file_path):
    try:
        # 读取文件内容
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # 替换英文双引号为中文双引号，第一个为左双引号，第二个为右双引号，循环
        # 使用正则表达式和回调函数来实现
        quote_count = 0
        
        def replace_quote(match):
            nonlocal quote_count
            quote_count += 1
            if quote_count % 2 == 1:
                return '“'  # 左双引号
            else:
                return '”'  # 右双引号
        
        # 替换所有英文双引号
        new_content = re.sub(r'"', replace_quote, content)
        
        # 写回文件
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        
        print(f"已处理文件: {file_path}")
        return True
    except Exception as e:
        print(f"处理文件 {file_path} 时出错: {e}")
        return False

# 遍历目录
def process_directory(directory):
    for root, dirs, files in os.walk(directory):
        # 排除指定目录
        dirs[:] = [d for d in dirs if d not in excluded_dirs]
        
        # 处理所有文件
        for file in files:
            if file.endswith('.txt') or file.endswith('.md'):
                file_path = os.path.join(root, file)
                replace_quotes_in_file(file_path)

# 主函数
if __name__ == "__main__":
    print("开始处理文件...")
    process_directory(root_dir)
    print("处理完成！")
