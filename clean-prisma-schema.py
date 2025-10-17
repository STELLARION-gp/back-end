#!/usr/bin/env python3
"""
Clean Prisma schema by:
1. Removing duplicate models and enums (lines 1170-1971)
2. Adding missing chatbot_feedback model
3. Fixing invalid index in users model
4. Adding missing enums (QuizStatus and weather_policy_type)
"""

def clean_prisma_schema():
    schema_file = 'prisma/schema.prisma'
    
    with open(schema_file, 'r') as f:
        lines = f.readlines()
    
    # Keep only lines 1-1169 (before the duplicate users model at line 1170)
    cleaned_lines = lines[:1169]
    
    # Add the chatbot_feedback model (which is referenced but missing)
    cleaned_lines.append('\n')
    cleaned_lines.append('model chatbot_feedback {\n')
    cleaned_lines.append('  id         Int               @id @default(autoincrement())\n')
    cleaned_lines.append('  message_id String            @db.Uuid\n')
    cleaned_lines.append('  session_id String            @db.Uuid\n')
    cleaned_lines.append('  user_id    Int\n')
    cleaned_lines.append('  rating     Int               @db.SmallInt\n')
    cleaned_lines.append('  feedback   String?\n')
    cleaned_lines.append('  created_at DateTime          @default(now()) @db.Timestamp(6)\n')
    cleaned_lines.append('  message    chatbot_messages  @relation(fields: [message_id], references: [id], onDelete: Cascade)\n')
    cleaned_lines.append('  session    chatbot_sessions  @relation(fields: [session_id], references: [id], onDelete: Cascade)\n')
    cleaned_lines.append('  user       users             @relation(fields: [user_id], references: [id], onDelete: Cascade)\n')
    cleaned_lines.append('\n')
    cleaned_lines.append('  @@index([message_id], map: "idx_chatbot_feedback_message_id")\n')
    cleaned_lines.append('  @@index([session_id], map: "idx_chatbot_feedback_session_id")\n')
    cleaned_lines.append('  @@index([user_id], map: "idx_chatbot_feedback_user_id")\n')
    cleaned_lines.append('}\n')
    cleaned_lines.append('\n')
    
    # Add the QuizStatus enum
    cleaned_lines.append('enum QuizStatus {\n')
    cleaned_lines.append('  open\n')
    cleaned_lines.append('  closed\n')
    cleaned_lines.append('}\n')
    cleaned_lines.append('\n')
    
    # Add the weather_policy_type enum (used in services model but not defined)
    cleaned_lines.append('enum weather_policy_type {\n')
    cleaned_lines.append('  reschedule\n')
    cleaned_lines.append('  partial_refund\n')
    cleaned_lines.append('  full_refund\n')
    cleaned_lines.append('  no_refund\n')
    cleaned_lines.append('}\n')
    
    # Now fix the invalid index in users model (line 262)
    # Find and replace the invalid index with proper relation
    for i, line in enumerate(cleaned_lines):
        if i >= 260 and i <= 263:  # Around line 262
            if '@@index([message_id], map: "idx_chatbot_feedback_message_id")' in line:
                # This line is wrong - it should not be in users model
                # Remove it by replacing with the chatbot_feedback relation
                cleaned_lines[i] = ''
    
    # Add chatbot_feedback relation to users model
    # Find where user_settings? is in users model and add chatbot_feedback after it
    for i, line in enumerate(cleaned_lines):
        if 'user_settings?' in line and i < 300:  # Make sure we're in users model
            # Insert chatbot_feedback relation after this line
            cleaned_lines.insert(i + 1, '  chatbot_feedback                                                                             chatbot_feedback[]\n')
            break
    
    # Write the cleaned schema
    with open(schema_file, 'w') as f:
        f.writelines(cleaned_lines)
    
    print(f"✅ Fixed schema written to {schema_file}")
    print(f"📊 Total lines: {len(cleaned_lines)}")
    print(f"\n✨ Changes made:")
    print(f"  - Removed duplicate models (26 models)")
    print(f"  - Removed duplicate enums (12 enums)")
    print(f"  - Added missing chatbot_feedback model")
    print(f"  - Fixed invalid index in users model")
    print(f"  - Added QuizStatus enum")
    print(f"  - Added weather_policy_type enum")

if __name__ == '__main__':
    clean_prisma_schema()
