'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatPrice } from '@/lib/ui'

// 商品双列大图卡（广场 / 收藏列表共用）
export default function GoodsCard({ item }: { item: any }) {
  const [loaded, setLoaded] = useState(false)

  return (
    <Link href={`/goods/${item.id}`} className="goods-card nm-card">
      {item.images?.length ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="goods-img"
          src={item.images[0]}
          alt={item.title}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.32s cubic-bezier(0.22,1,0.36,1)' }}
        />
      ) : (
        <div className="goods-img goods-img-empty">🛍️</div>
      )}
      <div className="goods-info">
        <div className="goods-title ellipsis-2">{item.title}</div>
        <div className="goods-price">{formatPrice(item.price)}</div>
        <div className="goods-meta">
          <span className="seller-wrap">
            <Avatar src={item.sellerAvatar} name={item.sellerName} size={17} />
            <span className="seller ellipsis">{item.sellerName}</span>
          </span>
          <span className="fav">♡ {item.favCount || 0}</span>
        </div>
      </div>
    </Link>
  )
}

// 头像：有图显示图，无图显示灰底首字（等价默认头像）。size = 直径 px
export function Avatar({ src, name, size = 32 }: { src?: string; name?: string; size?: number }) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        className="avatar"
        style={{ width: size, height: size }}
        src={src}
        alt=""
      />
    )
  }
  return (
    <span
      className="avatar avatar-empty"
      style={{ width: size, height: size, fontSize: size * 0.5 }}
    >
      {(name || '客').slice(0, 1)}
    </span>
  )
}
