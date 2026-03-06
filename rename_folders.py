import os

# 定义要重命名的文件夹映射
folder_mapping = {
    'inspirational': '励志',
    'novel': '小说',
    'poetry': '诗词',
    'prose': '散文'
}

# 练习文章文件夹路径
base_path = '练习文章'

# 遍历映射并重命名文件夹
for old_name, new_name in folder_mapping.items():
    old_path = os.path.join(base_path, old_name)
    new_path = os.path.join(base_path, new_name)
    
    if os.path.exists(old_path) and not os.path.exists(new_path):
        os.rename(old_path, new_path)
        print(f"已将 {old_path} 重命名为 {new_path}")
    elif os.path.exists(new_path):
        print(f"文件夹 {new_path} 已存在，跳过重命名")
    else:
        print(f"文件夹 {old_path} 不存在，跳过重命名")

print("重命名完成！")
