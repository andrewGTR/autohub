import Link from "next/link";

const manufacturers = [
  { name: "Alfa Romeo", logo: "/icons/alfa_romeo.png", link: "/marketplace?brand=Alfa%20Romeo" },
  { name: "Audi", logo: "/icons/audi.png", link: "/marketplace?brand=Audi" },
  { name: "BMW", logo: "/icons/bmw.png", link: "/marketplace?brand=BMW" },
  { name: "Chery", logo: "/icons/chery.png", link: "/marketplace?brand=Chery" },
  { name: "Chevrolet", logo: "/icons/chevrolet.png", link: "/marketplace?brand=Chevrolet" },
  { name: "Chrysler", logo: "/icons/chrysler.png", link: "/marketplace?brand=Chrysler" },
  { name: "Citroen", logo: "/icons/citroen.png", link: "/marketplace?brand=Citroen" },
  { name: "Cupra", logo: "/icons/cupra.png", link: "/marketplace?brand=Cupra" },
  { name: "Dacia", logo: "/icons/dacia.png", link: "/marketplace?brand=Dacia" },
  { name: "Dodge", logo: "/icons/dodge.png", link: "/marketplace?brand=Dodge" },
  { name: "Fiat", logo: "/icons/fiat.png", link: "/marketplace?brand=Fiat" },
  { name: "Ford", logo: "/icons/ford.png", link: "/marketplace?brand=Ford" },
  { name: "Honda", logo: "/icons/honda.png", link: "/marketplace?brand=Honda" },
  { name: "Hyundai", logo: "/icons/hyundai.png", link: "/marketplace?brand=Hyundai" },
  { name: "Infiniti", logo: "/icons/infinit.png", link: "/marketplace?brand=Infiniti" },
  { name: "Jaguar", logo: "/icons/jaguar.png", link: "/marketplace?brand=Jaguar" },
  { name: "Jeep", logo: "/icons/jeep.png", link: "/marketplace?brand=Jeep" },
  { name: "Kia", logo: "/icons/kia.png", link: "/marketplace?brand=Kia" },
  { name: "Land Rover", logo: "/icons/land-rover.png", link: "/marketplace?brand=Land%20Rover" },
  { name: "Lexus", logo: "/icons/lexus.png", link: "/marketplace?brand=Lexus" },
  { name: "Mercedes", logo: "/icons/mercedes.png", link: "/marketplace?brand=Mercedes" },
  { name: "Mini", logo: "/icons/mini.net.png", link: "/marketplace?brand=Mini" },
  { name: "Mitsubishi", logo: "/icons/mitsobishi.png", link: "/marketplace?brand=Mitsubishi" },
  { name: "Nissan", logo: "/icons/nissan.png", link: "/marketplace?brand=Nissan" },
  { name: "Peugeot", logo: "/icons/peugeot.png", link: "/marketplace?brand=Peugeot" },
  { name: "Porsche", logo: "/icons/porsche.png", link: "/marketplace?brand=Porsche" },
  { name: "Renault", logo: "/icons/renualt.png", link: "/marketplace?brand=Renault" },
  { name: "Seat", logo: "/icons/seat.png", link: "/marketplace?brand=Seat" },
  { name: "Skoda", logo: "/icons/skoda.png", link: "/marketplace?brand=Skoda" },
  { name: "Subaru", logo: "/icons/subaru.png", link: "/marketplace?brand=Subaru" },
  { name: "Suzuki", logo: "/icons/suzuki.png", link: "/marketplace?brand=Suzuki" },
  { name: "Toyota", logo: "/icons/toyota.png", link: "/marketplace?brand=Toyota" },
  { name: "Volkswagen", logo: "/icons/volkswagen.png", link: "/marketplace?brand=Volkswagen" },
  { name: "Volvo", logo: "/icons/volvo.png", link: "/marketplace?brand=Volvo" },
];

export default function ManufacturerSection() {
  return (
    <div className="mfr-section">
      <h1>Discover by car manufacturer</h1>
      <div className="mfr-grid-logos">
        {manufacturers.map((mfr, index) => (
          <div className="mfr-item" key={index}>
            <Link className="mfr-item-a" href={mfr.link}>
              <img className="mfr-logo" src={mfr.logo} alt={mfr.name} />
              {mfr.name}
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
