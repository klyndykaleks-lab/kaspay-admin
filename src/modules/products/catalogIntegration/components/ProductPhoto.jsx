import { useEffect, useState } from "react";

import { loadImage } from "../catalog.processes";

const ProductPhoto = ({ path, alt }) => {
  const [photo, setPhoto] = useState(null);
  useEffect(() => {
    let cancelled = false;
    let url;
    setPhoto(null);
    if (path && path !== "-")
      loadImage(path)
        .then((result) => {
          url = result;
          if (cancelled) URL.revokeObjectURL(url);
          else setPhoto(url);
        })
        .catch(() => {});
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [path]);
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded bg-muted px-1 text-center text-xs text-muted-foreground">
      {photo ? (
        <img
          src={photo}
          alt={alt}
          className="h-full w-full rounded object-cover"
        />
      ) : (
        "Нет фото"
      )}
    </div>
  );
};
export default ProductPhoto;
