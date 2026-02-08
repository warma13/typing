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
    
    print(f"成功读取Excel文件，共包含{len(df)}首诗词")
    print(f"列名: {list(df.columns)}")
    
    # 预览前几行数据
    print("\n前5行数据预览:")
    print(df.head())
    
    # 处理数据并保存为txt文件
    count = 0
    max_poems = 50
    
    for index, row in df.iterrows():
        if count >= max_poems:
            break
        
        try:
            # 提取诗词信息
            # 假设列名可能是：诗名、作者、年代、内容 或其他类似名称
            # 尝试不同的列名组合
            if '诗名' in df.columns:
                title = str(row['诗名']).strip()
            elif '标题' in df.columns:
                title = str(row['标题']).strip()
            else:
                title = f"诗_{index}"
            
            if '作者' in df.columns:
                author = str(row['作者']).strip()
            elif '作者名' in df.columns:
                author = str(row['作者名']).strip()
            else:
                author = "未知"
            
            if '年代' in df.columns:
                dynasty = str(row['年代']).strip()
            elif '朝代' in df.columns:
                dynasty = str(row['朝代']).strip()
            else:
                dynasty = "未知"
            
            if '内容' in df.columns:
                content = str(row['内容']).strip()
            elif '正文' in df.columns:
                content = str(row['正文']).strip()
            elif '诗内容' in df.columns:
                content = str(row['诗内容']).strip()
            else:
                content = ""
            
            # 清理标题，确保可以作为文件名
            safe_title = re.sub(r'[\\/:*?"<>|]', '_', title)
            if not safe_title:
                safe_title = f"诗_{index}"
            
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
            print(f"处理第{index}行时出错: {e}")
            continue
    
    print(f"\n处理完成，共保存{count}首诗词到 {output_dir}")
    
except Exception as e:
    print(f"读取Excel文件时出错: {e}")
    import traceback
    traceback.print_exc()
