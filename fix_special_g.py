#!/usr/bin/env python3
"""
修复word.json文件中的特殊'ɡ'字符为普通'g'字母
"""
import json
import os

def fix_special_g_in_json(json_file):
    """替换JSON文件中的特殊'ɡ'字符为普通'g'字母"""
    # 读取文件
    with open(json_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 替换特殊'ɡ'字符为普通'g'
    # 注意：这里的'ɡ'是特殊字符，不是普通的'g'
    fixed_content = content.replace('ɡ', 'g')
    
    # 保存修复后的内容
    with open(json_file, 'w', encoding='utf-8') as f:
        f.write(fixed_content)
    
    # 计算替换次数
    replace_count = content.count('ɡ')
    print(f"修复完成！成功替换了 {replace_count} 个特殊'ɡ'字符为普通'g'字母")
    return replace_count

if __name__ == "__main__":
    json_file_path = "chinese-xinhua/data/word.json"
    
    if os.path.exists(json_file_path):
        fix_special_g_in_json(json_file_path)
    else:
        print(f"文件不存在: {json_file_path}")
        # 尝试使用绝对路径
        abs_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), json_file_path)
        if os.path.exists(abs_path):
            print(f"使用绝对路径: {abs_path}")
            fix_special_g_in_json(abs_path)
        else:
            print(f"绝对路径也不存在: {abs_path}")
