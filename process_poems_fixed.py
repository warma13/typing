import pandas as pd
import os
import re

# 配置路径
input_file = 'd:\\Proj\\Trea\\dazi\\typing_practice\\poems\\古诗词七万首.xlsx'
output_dir = 'd:\\Proj\\Trea\\dazi\\typing_practice\\practice_articles\\poetry'

# 确保输出目录存在
os.makedirs(output_dir, exist_ok=True)

# 读取xlsx文件
try:
    # 尝试不同的sheet名称
    try:
        df = pd.read_excel(input_file, sheet_name='Sheet1')
    except:
        df = pd.read_excel(input_file, sheet_name=0)
    
    print(f"成功读取Excel文件，共包含{len(df)}行数据")
    print(f"列名: {list(df.columns)}")
    
    # 获取列名（假设只有一列）
    column_name = list(df.columns)[0]
    print(f"使用列名: {column_name}")
    
    # 预览前10行数据
    print("\n前10行数据预览:")
    for i in range(min(10, len(df))):
        value = str(df.iloc[i][column_name]).strip()
        print(f"{i}: {value}")
    
    # 处理数据并保存为txt文件
    count = 0
    max_poems = 50
    
    # 遍历数据，按行解析
    i = 0
    while i < len(df) and count < max_poems:
        try:
            # 读取诗名（当前行）
            title_row = df.iloc[i][column_name]
            if pd.isna(title_row):
                i += 1
                continue
            title = str(title_row).strip()
            
            # 跳过空行或无效行
            if not title:
                i += 1
                continue
            
            # 读取年代（下一行）
            i += 1
            if i >= len(df):
                break
            dynasty_row = df.iloc[i][column_name]
            dynasty = str(dynasty_row).strip() if not pd.isna(dynasty_row) else "未知"
            
            # 读取作者（下一行）
            i += 1
            if i >= len(df):
                break
            author_row = df.iloc[i][column_name]
            author = str(author_row).strip() if not pd.isna(author_row) else "未知"
            
            # 读取内容（下一行）
            i += 1
            if i >= len(df):
                break
            content_row = df.iloc[i][column_name]
            content = str(content_row).strip() if not pd.isna(content_row) else ""
            
            # 跳过空行（下一行，通常是NaN）
            i += 1
            
            # 清理标题，确保可以作为文件名
            safe_title = re.sub(r'[\\/:*?"<>|]', '_', title)
            if not safe_title:
                safe_title = f"诗_{count}"
            
            # 构建文件路径
            file_path = os.path.join(output_dir, f"{safe_title}.txt")
            
            # 构建文件内容：正文内容，换行，作者，年代，诗名
            file_content = f"{content}\n{author}\n{dynasty}\n{title}"
            
            # 保存文件
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(file_content)
            
            count += 1
            print(f"保存第{count}首诗词: {title}")
            
        except Exception as e:
            print(f"处理第{i}行时出错: {e}")
            i += 1
            continue
    
    print(f"\n处理完成，共保存{count}首诗词到 {output_dir}")
    
except Exception as e:
    print(f"读取Excel文件时出错: {e}")
    import traceback
    traceback.print_exc()
