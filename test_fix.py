#!/usr/bin/env python3
"""
测试word.json文件中的特殊'ɡ'字符是否已被修复
"""
import os

def test_special_g_in_json(json_file):
    """测试JSON文件中是否还有特殊'ɡ'字符"""
    # 读取文件
    with open(json_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 检查特殊'ɡ'字符
    special_g_count = content.count('ɡ')
    normal_g_count = content.count('g')
    
    print(f"文件中的特殊'ɡ'字符数量: {special_g_count}")
    print(f"文件中的普通'g'字符数量: {normal_g_count}")
    
    if special_g_count == 0:
        print("✅ 修复成功！文件中已没有特殊'ɡ'字符")
    else:
        print("❌ 修复失败！文件中仍有特殊'ɡ'字符")
    
    # 检查几个具体的例子
    print("\n检查几个具体的例子:")
    lines = content.split('\n')
    for i, line in enumerate(lines[:500]):  # 只检查前500行
        if 'ɡ' in line:
            print(f"第{i+1}行: {line.strip()}")
            break
    
    return special_g_count

if __name__ == "__main__":
    json_file_path = "chinese-xinhua/data/word.json"
    
    if os.path.exists(json_file_path):
        test_special_g_in_json(json_file_path)
    else:
        print(f"文件不存在: {json_file_path}")
