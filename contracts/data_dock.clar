;; DataDock - Data NFT Marketplace Contract

;; Constants
(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-not-token-owner (err u101))
(define-constant err-listing-not-found (err u102))
(define-constant err-insufficient-payment (err u103))
(define-constant err-already-listed (err u104))

;; Define NFT
(define-non-fungible-token data-nft uint)

;; Data structures
(define-map listings
    { token-id: uint }
    { price: uint, seller: principal }
)

(define-map token-data
    { token-id: uint }
    { 
      title: (string-utf8 256),
      description: (string-utf8 1024),
      encrypted-metadata: (string-utf8 4096),
      timestamp: uint
    }
)

(define-data-var last-token-id uint u0)

;; Private functions
(define-private (is-owner (token-id uint) (user principal))
    (is-eq user (unwrap! (nft-get-owner? data-nft token-id) false))
)

;; Public functions
(define-public (mint (title (string-utf8 256)) 
                    (description (string-utf8 1024))
                    (encrypted-metadata (string-utf8 4096)))
    (let
        (
            (token-id (+ (var-get last-token-id) u1))
        )
        (try! (nft-mint? data-nft token-id tx-sender))
        (map-set token-data
            { token-id: token-id }
            { 
              title: title,
              description: description,
              encrypted-metadata: encrypted-metadata,
              timestamp: block-height
            }
        )
        (var-set last-token-id token-id)
        (ok token-id)
    )
)

(define-public (list-for-sale (token-id uint) (price uint))
    (let ((owner (unwrap! (nft-get-owner? data-nft token-id) err-not-token-owner)))
        (asserts! (is-eq tx-sender owner) err-not-token-owner)
        (asserts! (is-none (map-get? listings {token-id: token-id})) err-already-listed)
        (ok (map-set listings
            { token-id: token-id }
            { price: price, seller: tx-sender }
        ))
    )
)

(define-public (cancel-listing (token-id uint))
    (let ((owner (unwrap! (nft-get-owner? data-nft token-id) err-not-token-owner)))
        (asserts! (is-eq tx-sender owner) err-not-token-owner)
        (ok (map-delete listings {token-id: token-id}))
    )
)

(define-public (purchase (token-id uint))
    (let (
        (listing (unwrap! (map-get? listings {token-id: token-id}) err-listing-not-found))
        (price (get price listing))
        (seller (get seller listing))
    )
        (try! (stx-transfer? price tx-sender seller))
        (try! (nft-transfer? data-nft token-id seller tx-sender))
        (map-delete listings {token-id: token-id})
        (ok true)
    )
)

;; Read-only functions
(define-read-only (get-listing (token-id uint))
    (map-get? listings {token-id: token-id})
)

(define-read-only (get-token-data (token-id uint))
    (map-get? token-data {token-id: token-id})
)

(define-read-only (get-owner (token-id uint))
    (nft-get-owner? data-nft token-id)
)