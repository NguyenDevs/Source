# Sử dụng Node.js bản 18 (LTS) trên nền Alpine để giảm dung lượng image
FROM node:18-alpine

# Cài đặt các công cụ cần thiết (nếu có native dependencies)
RUN apk add --no-cache libc6-compat

# Tạo thư mục làm việc trong container
WORKDIR /app

# Copy các file package để tận dụng Docker cache cho việc cài đặt dependencies
COPY package*.json ./

# Cài đặt dependencies (sử dụng ci để đảm bảo tính nhất quán)
RUN npm install

# Copy toàn bộ mã nguồn vào container
COPY . .

# Tạo thư mục uploads nếu chưa có
RUN mkdir -p uploads

# Mở cổng 3000
EXPOSE 3000

# Lệnh khởi chạy ứng dụng
CMD ["npm", "start"]
