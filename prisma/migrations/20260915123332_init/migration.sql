-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "nickname" TEXT NOT NULL DEFAULT '新朋友',
    "avatar" TEXT NOT NULL DEFAULT '',
    "wechat" TEXT NOT NULL DEFAULT '',
    "region" TEXT NOT NULL DEFAULT '',
    "role" TEXT NOT NULL DEFAULT 'user',
    "status" TEXT NOT NULL DEFAULT 'normal',
    "create_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_login_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goods" (
    "id" TEXT NOT NULL,
    "seller_id" TEXT NOT NULL,
    "seller_name" TEXT NOT NULL DEFAULT '',
    "seller_avatar" TEXT NOT NULL DEFAULT '',
    "seller_wechat" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "desc" TEXT NOT NULL DEFAULT '',
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "trade_type" TEXT NOT NULL DEFAULT 'pickup',
    "status" TEXT NOT NULL DEFAULT 'on',
    "views" INTEGER NOT NULL DEFAULT 0,
    "comment_count" INTEGER NOT NULL DEFAULT 0,
    "fav_count" INTEGER NOT NULL DEFAULT 0,
    "create_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_time" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" TEXT NOT NULL,
    "goods_id" TEXT NOT NULL,
    "goods_title" TEXT NOT NULL DEFAULT '',
    "seller_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "user_name" TEXT NOT NULL DEFAULT '',
    "user_avatar" TEXT NOT NULL DEFAULT '',
    "content" TEXT NOT NULL,
    "parent_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'normal',
    "create_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ts" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favorites" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "goods_id" TEXT NOT NULL,
    "create_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "goods_id" TEXT NOT NULL,
    "goods_title" TEXT NOT NULL DEFAULT '',
    "goods_image" TEXT NOT NULL DEFAULT '',
    "buyer_id" TEXT NOT NULL,
    "seller_id" TEXT NOT NULL,
    "buyer_name" TEXT NOT NULL DEFAULT '',
    "buyer_avatar" TEXT NOT NULL DEFAULT '',
    "seller_name" TEXT NOT NULL DEFAULT '',
    "seller_avatar" TEXT NOT NULL DEFAULT '',
    "last_msg" TEXT NOT NULL DEFAULT '',
    "last_msg_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unread_buyer" INTEGER NOT NULL DEFAULT 0,
    "unread_seller" INTEGER NOT NULL DEFAULT 0,
    "create_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "goods_id" TEXT,
    "from_id" TEXT NOT NULL,
    "to_id" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'text',
    "content" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT '',
    "deal_id" TEXT,
    "goods_title" TEXT,
    "goods_image" TEXT,
    "price" DOUBLE PRECISION,
    "buyer_name" TEXT,
    "seller_name" TEXT,
    "create_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deals" (
    "id" TEXT NOT NULL,
    "goods_id" TEXT NOT NULL,
    "goods_title" TEXT NOT NULL DEFAULT '',
    "goods_image" TEXT NOT NULL DEFAULT '',
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "buyer_id" TEXT NOT NULL,
    "buyer_name" TEXT NOT NULL DEFAULT '',
    "seller_id" TEXT NOT NULL,
    "seller_name" TEXT NOT NULL DEFAULT '',
    "source_message_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'done',
    "create_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "deal_id" TEXT NOT NULL,
    "goods_id" TEXT NOT NULL,
    "goods_title" TEXT NOT NULL DEFAULT '',
    "from_id" TEXT NOT NULL,
    "from_name" TEXT NOT NULL DEFAULT '',
    "to_id" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "text" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'normal',
    "create_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "desc" TEXT NOT NULL DEFAULT '',
    "reporter_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "handle" TEXT NOT NULL DEFAULT '',
    "handle_time" TIMESTAMP(3),
    "create_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "create_ts" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "posts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "user_name" TEXT NOT NULL DEFAULT '',
    "user_avatar" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "like_count" INTEGER NOT NULL DEFAULT 0,
    "reply_count" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'normal',
    "create_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ts" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_replies" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "parent_id" TEXT,
    "to_user_id" TEXT,
    "to_user_name" TEXT,
    "user_id" TEXT NOT NULL,
    "user_name" TEXT NOT NULL DEFAULT '',
    "user_avatar" TEXT NOT NULL DEFAULT '',
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'normal',
    "create_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ts" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "post_replies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_likes" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "ts" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "post_likes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "favorites_user_id_goods_id_key" ON "favorites"("user_id", "goods_id");

-- CreateIndex
CREATE UNIQUE INDEX "conversations_goods_id_buyer_id_key" ON "conversations"("goods_id", "buyer_id");

-- CreateIndex
CREATE UNIQUE INDEX "deals_source_message_id_key" ON "deals"("source_message_id");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_deal_id_from_id_key" ON "reviews"("deal_id", "from_id");

-- CreateIndex
CREATE UNIQUE INDEX "post_likes_post_id_user_id_key" ON "post_likes"("post_id", "user_id");
