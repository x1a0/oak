FROM node:10-buster

WORKDIR /home/www-data
COPY . .

#RUN chown -R www-data:www-data /home/www-data

#USER www-data
RUN npm install \
    && npm run build \
    && npm install -g serve

EXPOSE 5000

CMD serve -s build
