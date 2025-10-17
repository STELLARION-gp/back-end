#!/usr/bin/env python3
"""
Script to fix Prisma schema by removing duplicate models and enums.
"""

def fix_prisma_schema():
    schema_file = 'prisma/schema.prisma'
    
    with open(schema_file, 'r') as f:
        lines = f.readlines()
    
    # Find the line number where duplicates start (after QuizStatus enum closes)
    # We need to find "enum QuizStatus" and keep everything until its closing brace
    
    output_lines = []
    found_quiz_status = False
    quiz_status_closed = False
    skip_rest = False
    
    for i, line in enumerate(lines, 1):
        if skip_rest:
            continue
            
        if line.strip() == 'enum QuizStatus {':
            found_quiz_status = True
            output_lines.append(line)
        elif found_quiz_status and not quiz_status_closed and line.strip() == '}':
            quiz_status_closed = True
            output_lines.append(line)
            skip_rest = True  # Skip everything after QuizStatus closes
        elif not skip_rest:
            output_lines.append(line)
    
    # Now we need to add the missing chatbot_feedback model and fix the users model index
    # Find the users model and fix it
    final_lines = []
    in_users_model = False
    users_fields_done = False
    
    for i, line in enumerate(output_lines):
        # Fix the invalid index in users model
        if '@@index([message_id], map: "idx_chatbot_feedback_message_id")' in line and in_users_model:
            # Replace with chatbot_feedback relation
            final_lines.append('  chatbot_feedback                                                                             chatbot_feedback[]\n')
            final_lines.append('\n')
            final_lines.append('  @@index([is_active], map: "idx_users_active")\n')
            final_lines.append('  @@index([email], map: "idx_users_email")\n')
            final_lines.append('  @@index([firebase_uid], map: "idx_users_firebase_uid")\n')
            final_lines.append('  @@index([role], map: "idx_users_role")\n')
            final_lines.append('  @@index([subscription_plan], map: "idx_users_subscription_plan")\n')
            final_lines.append('  @@index([subscription_status], map: "idx_users_subscription_status")\n')
            final_lines.append('}\n')
            final_lines.append('\n')
            # Add the missing chatbot_feedback model
            final_lines.append('model chatbot_feedback {\n')
            final_lines.append('  id         Int               @id @default(autoincrement())\n')
            final_lines.append('  message_id String            @db.Uuid\n')
            final_lines.append('  session_id String            @db.Uuid\n')
            final_lines.append('  user_id    Int\n')
            final_lines.append('  rating     Int               @db.SmallInt\n')
            final_lines.append('  feedback   String?\n')
            final_lines.append('  created_at DateTime          @default(now()) @db.Timestamp(6)\n')
            final_lines.append('  message    chatbot_messages  @relation(fields: [message_id], references: [id], onDelete: Cascade)\n')
            final_lines.append('  session    chatbot_sessions  @relation(fields: [session_id], references: [id], onDelete: Cascade)\n')
            final_lines.append('  user       users             @relation(fields: [user_id], references: [id], onDelete: Cascade)\n')
            final_lines.append('\n')
            final_lines.append('  @@index([message_id], map: "idx_chatbot_feedback_message_id")\n')
            final_lines.append('  @@index([session_id], map: "idx_chatbot_feedback_session_id")\n')
            final_lines.append('  @@index([user_id], map: "idx_chatbot_feedback_user_id")\n')
            final_lines.append('}\n')
            users_fields_done = True
            in_users_model = False
            continue
        
        if line.strip().startswith('model users {'):
            in_users_model = True
        
        if not users_fields_done:
            final_lines.append(line)
    
    # Write the fixed schema
    with open(schema_file, 'w') as f:
        f.writelines(final_lines)
    
    print(f"Fixed schema written to {schema_file}")
    print(f"Total lines: {len(final_lines)}")

if __name__ == '__main__':
    fix_prisma_schema()
